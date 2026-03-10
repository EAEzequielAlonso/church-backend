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
import { BudgetLine } from '../entities/budget-line.entity';
import { BudgetLineType } from '../enums/treasury.enums';

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
      if (!church) throw new NotFoundException('Church not found');

      // 1. Validate Transaction Type & Inputs
      if (data.type === TransactionType.INCOME) {
        if (!data.destinationAccountId)
          throw new BadRequestException(
            'Destination Account required for Income',
          );
        if (!data.categoryId)
          throw new BadRequestException('Category required for Income');
      } else if (data.type === TransactionType.EXPENSE) {
        if (!data.sourceAccountId)
          throw new BadRequestException('Source Account required for Expense');
        if (!data.categoryId)
          throw new BadRequestException('Category required for Expense');
      } else if (data.type === TransactionType.TRANSFER) {
        if (!data.sourceAccountId || !data.destinationAccountId)
          throw new BadRequestException(
            'Source and Destination Accounts required for Transfer',
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
        if (!category) throw new NotFoundException('Category not found');
        if (category.type !== data.type)
          throw new BadRequestException(
            `Category type mismatch. Expected ${data.type}`,
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

  private async checkBudgetWarning(
    manager: any,
    churchId: string,
    tx: TreasuryTransaction,
  ) {
    const txDate = new Date(tx.date);
    const year = txDate.getFullYear();
    const month = txDate.getMonth() + 1;

    const lineType = tx.type === TransactionType.INCOME
      ? BudgetLineType.INCOME
      : tx.type === TransactionType.EXPENSE
        ? BudgetLineType.EXPENSE
        : null;

    if (!lineType) return null; // TRANSFER no tiene budget line

    const lineRepo = manager.getRepository(BudgetLine);
    const txRepo = manager.getRepository(TreasuryTransaction);

    // Priority matching: most specific first
    let line = null;

    // 1. Match both ministry + category
    if (tx.ministry && tx.category) {
      line = await lineRepo
        .createQueryBuilder('bl')
        .innerJoin('bl.budget', 'b')
        .where('b.churchId = :churchId', { churchId })
        .andWhere('b.year = :year AND b.month = :month', { year, month })
        .andWhere('bl.type = :type', { type: lineType })
        .andWhere('bl.ministryId = :minId', { minId: tx.ministry.id || (tx as any).ministryId })
        .andWhere('bl.categoryId = :catId', { catId: tx.category.id || (tx as any).categoryId })
        .getOne();
    }

    // 2. Match category only
    if (!line && tx.category) {
      line = await lineRepo
        .createQueryBuilder('bl')
        .innerJoin('bl.budget', 'b')
        .where('b.churchId = :churchId', { churchId })
        .andWhere('b.year = :year AND b.month = :month', { year, month })
        .andWhere('bl.type = :type', { type: lineType })
        .andWhere('bl.ministryId IS NULL')
        .andWhere('bl.categoryId = :catId', { catId: tx.category.id || (tx as any).categoryId })
        .getOne();
    }

    // 3. Match ministry only
    if (!line && tx.ministry) {
      line = await lineRepo
        .createQueryBuilder('bl')
        .innerJoin('bl.budget', 'b')
        .where('b.churchId = :churchId', { churchId })
        .andWhere('b.year = :year AND b.month = :month', { year, month })
        .andWhere('bl.type = :type', { type: lineType })
        .andWhere('bl.ministryId = :minId', { minId: tx.ministry.id || (tx as any).ministryId })
        .andWhere('bl.categoryId IS NULL')
        .getOne();
    }

    if (!line) return null;

    // Calculate actual SUM for this specific combination
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);
    const txType = tx.type;

    let qb = txRepo
      .createQueryBuilder('t')
      .select('SUM(t.amountBaseCurrency)', 'total')
      .where('t.churchId = :churchId', { churchId })
      .andWhere('t.date >= :start', { start: periodStart })
      .andWhere('t.date <= :end', { end: periodEnd })
      .andWhere('t.type = :txType', { txType })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .andWhere('t.deletedAt IS NULL');

    if (line.ministryId) {
      qb = qb.andWhere('t.ministryId = :minId', { minId: line.ministryId });
    }
    if (line.categoryId) {
      qb = qb.andWhere('t.categoryId = :catId', { catId: line.categoryId });
    }

    const result = await qb.getRawOne();
    const actual = parseFloat(result?.total || '0');
    const budgeted = Number(line.budgetedAmount);
    const pct = budgeted > 0 ? (actual / budgeted) * 100 : 0;

    if (pct < 80) return null;

    return {
      level: pct > 100 ? 'EXCEEDED' as const : '80_PERCENT' as const,
      executionPercentage: Math.round(pct * 100) / 100,
      budgetedAmount: budgeted,
      actualAmount: Math.round(actual * 100) / 100,
    };
  }
}
