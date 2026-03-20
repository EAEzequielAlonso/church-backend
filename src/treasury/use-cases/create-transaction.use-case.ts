import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TreasuryPolicy } from '../policies/treasury.policy';
import { TreasuryTransaction } from '../entities/treasury-transaction.entity';
import {
  TransactionStatus,
  Currency,
  TransactionType,
  AuditEntityType,
  AuditAction,
} from '../enums/treasury.enums';
import { Account } from '../entities/account.entity';
import { TransactionCategory } from '../entities/transaction-category.entity';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { lockAccountsInOrder } from '../helpers/lock-accounts.helper';
import { Church } from '../../churches/entities/church.entity';
import { ClosedPeriod } from '../entities/closed-period.entity';
import { TreasuryAuditLog } from '../entities/treasury-audit-log.entity';
import { snapshotTransaction } from '../helpers/audit-snapshot.helper';
import { BudgetPeriod, BudgetPeriodStatus } from '../../budget/entities/budget-period.entity';
import { BudgetAllocation } from '../../budget/entities/budget-allocation.entity';

@Injectable()
export class CreateTransactionUseCase {
  constructor(
    private readonly dataSource: DataSource,
    private readonly treasuryPolicy: TreasuryPolicy,
  ) { }

  async execute(
    data: CreateTransactionDto & { userId: string; churchId: string; userRole?: string; userEmail?: string; ipAddress?: string },
  ): Promise<TreasuryTransaction> {
    return this.dataSource.transaction(async (manager) => {
      const txRepo = manager.getRepository(TreasuryTransaction);
      const accountRepo = manager.getRepository(Account);
      const categoryRepo = manager.getRepository(TransactionCategory);
      const churchRepo = manager.getRepository(Church);

      // 0. Load church for baseCurrency
      const church = await churchRepo.findOne({
        where: { id: data.churchId },
      });
      if (!church) throw new NotFoundException('Iglesia no encontrada');

      // 1. Validate Transaction Type & Inputs
      if (data.type === TransactionType.INCOME) {
        if (!data.destinationAccountId)
          throw new BadRequestException(
            'Se requiere una cuenta destino para los ingresos',
          );
        if (!data.categoryId)
          throw new BadRequestException('Se requiere una categoría para los ingresos');
      } else if (data.type === TransactionType.EXPENSE) {
        if (!data.sourceAccountId)
          throw new BadRequestException('Se requiere una cuenta origen para los egresos');
        if (!data.categoryId)
          throw new BadRequestException('Se requiere una categoría para los egresos');
      } else if (data.type === TransactionType.TRANSFER) {
        if (!data.sourceAccountId || !data.destinationAccountId)
          throw new BadRequestException(
            'Se requieren cuentas de origen y destino para las transferencias',
          );
      }

      // 2. Lock & fetch accounts (ordered by ID to prevent deadlocks)
      const accountIds = [
        data.sourceAccountId,
        data.destinationAccountId,
      ].filter(Boolean) as string[];

      const lockedAccounts = await lockAccountsInOrder(
        accountRepo,
        accountIds,
        data.churchId,
      );

      const sourceAccount = data.sourceAccountId
        ? lockedAccounts.get(data.sourceAccountId) || null
        : null;
      const destinationAccount = data.destinationAccountId
        ? lockedAccounts.get(data.destinationAccountId) || null
        : null;

      // 3. Currency validation
      const txCurrency = data.currency || (sourceAccount?.currency ?? destinationAccount?.currency ?? Currency.ARS);

      if (data.type === TransactionType.INCOME && destinationAccount) {
        if (txCurrency !== destinationAccount.currency)
          throw new BadRequestException(
            `La moneda de la transacción (${txCurrency}) no coincide con la cuenta destino (${destinationAccount.currency}).`,
          );
      }

      if (data.type === TransactionType.EXPENSE && sourceAccount) {
        if (txCurrency !== sourceAccount.currency)
          throw new BadRequestException(
            `La moneda de la transacción (${txCurrency}) no coincide con la cuenta origen (${sourceAccount.currency}).`,
          );
      }

      if (data.type === TransactionType.TRANSFER && sourceAccount && destinationAccount) {
        if (txCurrency !== sourceAccount.currency)
          throw new BadRequestException(
            `En transferencias, la moneda debe coincidir con la cuenta origen (${sourceAccount.currency}).`,
          );
        if (
          sourceAccount.currency !== destinationAccount.currency &&
          (!data.exchangeRate || data.exchangeRate === 1)
        )
          throw new BadRequestException(
            'Transferencia cross-currency requiere un tipo de cambio distinto a 1.',
          );
      }

      // 4. Resolve exchangeRate
      let exchangeRate: number;
      if (txCurrency === church.baseCurrency) {
        exchangeRate = 1; // Force 1 when same as base
      } else {
        if (!data.exchangeRate)
          throw new BadRequestException(
            `Se requiere tipo de cambio para transacciones en ${txCurrency} (moneda base: ${church.baseCurrency}).`,
          );
        exchangeRate = data.exchangeRate;
      }

      // 5. Fetch & validate category
      let category: TransactionCategory | null = null;
      if (data.categoryId) {
        category = await categoryRepo.findOne({
          where: { id: data.categoryId },
        });
        if (!category) throw new NotFoundException('Categoría no encontrada');
        if (category.type !== data.type)
          throw new BadRequestException(
            `El tipo de categoría no coincide. Se esperaba ${data.type}`,
          );
      }

      // 6. Policy validations
      this.treasuryPolicy.validateAmount(data.amount);
      if (sourceAccount && destinationAccount) {
        this.treasuryPolicy.validateTransactionFlow(
          sourceAccount,
          destinationAccount,
        );
      }

      // 7. Validate period is not closed
      const txDate =
        typeof data.date === 'string'
          ? new Date(data.date)
          : data.date || new Date();
      const txYear = txDate.getFullYear();
      const txMonth = txDate.getMonth() + 1;

      const closedPeriodRepo = manager.getRepository(ClosedPeriod);
      const closedPeriod = await closedPeriodRepo.findOne({
        where: { churchId: data.churchId, year: txYear, month: txMonth },
      });

      if (closedPeriod && closedPeriod.isClosed) {
        throw new BadRequestException(
          `No se pueden crear transacciones en el período ${txYear}-${String(txMonth).padStart(2, '0')} porque está cerrado.`,
        );
      }

      // 8. Calculate amountBaseCurrency (always server-side)
      const amountBaseCurrency = data.amount * exchangeRate;

      // 9. Create Transaction Record
      const status = TransactionStatus.COMPLETED;
      const tx = txRepo.create({
        churchId: data.churchId,
        description: data.description,
        amount: data.amount,
        amountBaseCurrency,
        currency: txCurrency,
        exchangeRate,
        sourceAccount: sourceAccount,
        destinationAccount: destinationAccount,
        category: category,
        ministry: data.ministryId ? { id: data.ministryId } : null,
        status,
        type: data.type,
        createdById: data.userId,
        isCorrection: false,
        correctedTransactionId: null,
        date:
          typeof data.date === 'string'
            ? new Date(data.date)
            : data.date || new Date(),
      });

      // 9. Update Balances (with locks already acquired)
      if (status === TransactionStatus.COMPLETED) {
        const amountVal = Number(tx.amount);

        if (sourceAccount && tx.type === TransactionType.EXPENSE) {
          sourceAccount.balance = Number(sourceAccount.balance) - amountVal;
          await accountRepo.save(sourceAccount);
        } else if (
          destinationAccount &&
          tx.type === TransactionType.INCOME
        ) {
          destinationAccount.balance =
            Number(destinationAccount.balance) + amountVal;
          await accountRepo.save(destinationAccount);
        } else if (
          sourceAccount &&
          destinationAccount &&
          tx.type === TransactionType.TRANSFER
        ) {
          sourceAccount.balance = Number(sourceAccount.balance) - amountVal;
          await accountRepo.save(sourceAccount);

          const destAmount = amountVal * exchangeRate;
          destinationAccount.balance =
            Number(destinationAccount.balance) + destAmount;
          await accountRepo.save(destinationAccount);
        }
      }

      const savedTx = await txRepo.save(tx);

      // 10. Audit log
      const auditRepo = manager.getRepository(TreasuryAuditLog);
      await auditRepo.save(auditRepo.create({
        churchId: data.churchId,
        entityType: AuditEntityType.TRANSACTION,
        entityId: savedTx.id,
        action: AuditAction.CREATE,
        before: null,
        after: snapshotTransaction(savedTx),
        entityVersion: 'v1',
        performedByUserId: data.userId,
        performedByEmail: data.userEmail || null,
        performedByRole: data.userRole || null,
        ipAddress: data.ipAddress || null,
        reason: data.reason || null,
      }));

      // 11. Budget warning (non-blocking, informational)
      let budgetWarning = null;
      if (savedTx.status === TransactionStatus.COMPLETED) {
        budgetWarning = await this.checkBudgetWarning(manager, data.churchId, savedTx);
      }

      return { ...savedTx, budgetWarning };
    });
  }

  /**
   * Non-blocking budget warning using BudgetPeriod + BudgetAllocation.
   * Returns a warning object if budget execution exceeds 80% or 100%.
   */
  private async checkBudgetWarning(
    manager: any,
    churchId: string,
    tx: TreasuryTransaction,
  ) {
    // Only check INCOME/EXPENSE, skip TRANSFER
    if (tx.type !== TransactionType.INCOME && tx.type !== TransactionType.EXPENSE) {
      return null;
    }

    const txDate = new Date(tx.date);
    const periodRepo = manager.getRepository(BudgetPeriod);
    const allocationRepo = manager.getRepository(BudgetAllocation);
    const txRepo = manager.getRepository(TreasuryTransaction);

    // 1. Find ACTIVE periods containing this transaction date
    const periods = await periodRepo
      .createQueryBuilder('p')
      .where('p.churchId = :churchId', { churchId })
      .andWhere('p.status = :status', { status: BudgetPeriodStatus.ACTIVE })
      .andWhere('p.startDate <= :txDate', { txDate })
      .andWhere('p.endDate >= :txDate', { txDate })
      .getMany();

    if (!periods || periods.length === 0) return null;

    // 2. For each period, find matching allocation (priority: category+ministry > category > ministry)
    for (const period of periods) {
      let allocation = null;
      const txCategoryId = tx.category?.id || (tx as any).categoryId || null;
      const txMinistryId = tx.ministry?.id || (tx as any).ministryId || null;

      // Priority 1: category + ministry
      if (txCategoryId && txMinistryId) {
        allocation = await allocationRepo.findOne({
          where: {
            budgetPeriodId: period.id,
            categoryId: txCategoryId,
            ministryId: txMinistryId,
            type: tx.type,
            churchId,
          },
        });
      }

      // Priority 2: category only
      if (!allocation && txCategoryId) {
        allocation = await allocationRepo.findOne({
          where: {
            budgetPeriodId: period.id,
            categoryId: txCategoryId,
            ministryId: null as any,
            type: tx.type,
            churchId,
          },
        });
      }

      // Priority 3: ministry only
      if (!allocation && txMinistryId) {
        allocation = await allocationRepo.findOne({
          where: {
            budgetPeriodId: period.id,
            ministryId: txMinistryId,
            categoryId: null as any,
            type: tx.type,
            churchId,
          },
        });
      }

      if (!allocation) continue;

      // 3. Calculate executed amount within the period range
      let qb = txRepo
        .createQueryBuilder('t')
        .select('COALESCE(SUM(t.amountBaseCurrency), 0)', 'total')
        .where('t.churchId = :churchId', { churchId })
        .andWhere('t.date >= :start', { start: period.startDate })
        .andWhere('t.date <= :end', { end: period.endDate })
        .andWhere('t.type = :txType', { txType: tx.type })
        .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
        .andWhere('t.deletedAt IS NULL');

      if (allocation.categoryId) {
        qb = qb.andWhere('t.categoryId = :catId', { catId: allocation.categoryId });
      }
      if (allocation.ministryId) {
        qb = qb.andWhere('t.ministryId = :minId', { minId: allocation.ministryId });
      }

      const result = await qb.getRawOne();
      const executedAmount = parseFloat(result?.total || '0');
      const budgetedAmount = Number(allocation.amountBaseCurrency);
      const totalAfterTx = executedAmount + Number(tx.amountBaseCurrency);
      const pct = budgetedAmount > 0 ? (totalAfterTx / budgetedAmount) * 100 : 0;

      if (pct < 80) continue;

      return {
        level: pct > 100 ? ('EXCEEDED' as const) : ('WARNING_80' as const),
        periodName: period.name,
        executionPercentage: Math.round(pct * 100) / 100,
        budgetedAmount,
        executedAmount: Math.round(totalAfterTx * 100) / 100,
        remainingAmount: Math.round((budgetedAmount - totalAfterTx) * 100) / 100,
      };
    }

    return null;
  }
}
