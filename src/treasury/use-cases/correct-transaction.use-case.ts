import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TreasuryTransaction } from '../entities/treasury-transaction.entity';
import { Account } from '../entities/account.entity';
import { TransactionCategory } from '../entities/transaction-category.entity';
import { TreasuryAuditLog } from '../entities/treasury-audit-log.entity';
import {
    TransactionStatus,
    TransactionType,
    Currency,
    AuditEntityType,
    AuditAction,
} from '../enums/treasury.enums';
import { TreasuryPolicy } from '../policies/treasury.policy';
import { lockAccountsInOrder } from '../helpers/lock-accounts.helper';
import { ClosedPeriod } from '../entities/closed-period.entity';
import { snapshotTransaction } from '../helpers/audit-snapshot.helper';

export interface CorrectTransactionDto {
    transactionId: string;
    churchId: string;
    userId: string;
    reason: string;
    userRole?: string;
    userEmail?: string;
    ipAddress?: string;
    // Corrected values (all optional — defaults to original)
    newAmount?: number;
    newSourceAccountId?: string;
    newDestinationAccountId?: string;
    newCategoryId?: string;
    newDescription?: string;
}

@Injectable()
export class CorrectTransactionUseCase {
    constructor(
        private readonly dataSource: DataSource,
        private readonly policy: TreasuryPolicy,
    ) { }

    async execute(
        dto: CorrectTransactionDto,
    ): Promise<{ reversal: TreasuryTransaction; correction: TreasuryTransaction }> {
        if (!dto.reason || dto.reason.trim().length === 0) {
            throw new BadRequestException(
                'Debe proporcionar un motivo para la corrección.',
            );
        }

        return this.dataSource.transaction(async (manager) => {
            const txRepo = manager.getRepository(TreasuryTransaction);
            const accountRepo = manager.getRepository(Account);
            const categoryRepo = manager.getRepository(TransactionCategory);
            const auditRepo = manager.getRepository(TreasuryAuditLog);

            // 1. Load original transaction
            const original = await txRepo.findOne({
                where: { id: dto.transactionId, churchId: dto.churchId },
                relations: ['sourceAccount', 'destinationAccount', 'category', 'ministry'],
            });

            if (!original)
                throw new NotFoundException('Transacción no encontrada.');

            if (original.status !== TransactionStatus.COMPLETED)
                throw new BadRequestException(
                    'Solo se pueden corregir transacciones completadas.',
                );

            // 1b. Check if original tx is in a closed period
            const closedPeriodRepo = manager.getRepository(ClosedPeriod);
            const origDate = new Date(original.date);
            const origYear = origDate.getFullYear();
            const origMonth = origDate.getMonth() + 1;

            const closedPeriod = await closedPeriodRepo.findOne({
                where: { churchId: dto.churchId, year: origYear, month: origMonth },
            });

            const isInClosedPeriod = closedPeriod && closedPeriod.isClosed;
            const periodNote = isInClosedPeriod
                ? ` [Período ${origYear}-${String(origMonth).padStart(2, '0')} cerrado]`
                : '';
            const correctionDate = new Date(); // Always NOW (falls in open period)

            // 2. Collect all account IDs that will be involved
            const allAccountIds = [
                original.sourceAccount?.id,
                original.destinationAccount?.id,
                dto.newSourceAccountId,
                dto.newDestinationAccountId,
            ].filter(Boolean) as string[];

            // 3. Lock ALL accounts in ascending order (prevents deadlocks)
            const lockedAccounts = await lockAccountsInOrder(
                accountRepo,
                allAccountIds,
                dto.churchId,
            );

            // 3b. Validate currency: new accounts must match original tx currency
            if (dto.newSourceAccountId) {
                const newSource = lockedAccounts.get(dto.newSourceAccountId);
                if (newSource && newSource.currency !== original.currency)
                    throw new BadRequestException(
                        `La nueva cuenta origen (${newSource.currency}) no coincide con la moneda de la transacción (${original.currency}).`,
                    );
            }
            if (dto.newDestinationAccountId) {
                const newDest = lockedAccounts.get(dto.newDestinationAccountId);
                if (newDest && original.type === TransactionType.TRANSFER) {
                    // For transfers, dest can be different currency (cross-currency)
                    // No validation needed — exchangeRate handles conversion
                } else if (newDest && newDest.currency !== original.currency) {
                    throw new BadRequestException(
                        `La nueva cuenta destino (${newDest.currency}) no coincide con la moneda de la transacción (${original.currency}).`,
                    );
                }
            }

            // 4. Create REVERSAL transaction (type inverted, amount positive)
            const reversalType = this.invertType(original.type);
            const reversalSource = original.type === TransactionType.TRANSFER
                ? original.destinationAccount  // Invert source/dest for transfer
                : original.sourceAccount;
            const reversalDest = original.type === TransactionType.TRANSFER
                ? original.sourceAccount  // Invert source/dest for transfer
                : original.destinationAccount;

            const reversal = txRepo.create({
                churchId: dto.churchId,
                type: reversalType,
                description: `Corrección de: ${original.description}${periodNote}. Motivo: ${dto.reason}`,
                amount: original.amount,
                amountBaseCurrency: original.amountBaseCurrency,
                currency: original.currency,
                exchangeRate: original.exchangeRate,
                sourceAccount: reversalType === TransactionType.EXPENSE || reversalType === TransactionType.TRANSFER
                    ? reversalSource : null,
                destinationAccount: reversalType === TransactionType.INCOME || reversalType === TransactionType.TRANSFER
                    ? reversalDest : null,
                category: original.category,
                ministry: original.ministry,
                status: TransactionStatus.COMPLETED,
                createdById: dto.userId,
                isCorrection: true,
                isInvalidated: true, // REVERSAL is invalidated for reports
                correctedTransactionId: original.id,
                date: correctionDate,
            });

            // Apply reversal balance impact
            this.applyBalanceImpact(reversal, lockedAccounts);
            const savedReversal = await txRepo.save(reversal);

            // Mark original as invalidated
            original.isInvalidated = true;
            await txRepo.save(original);

            // Save updated account balances after reversal
            for (const account of lockedAccounts.values()) {
                await accountRepo.save(account);
            }

            // 5. Create CORRECTION transaction with new values
            const newAmount = dto.newAmount ?? Number(original.amount);
            const newExchangeRate = Number(original.exchangeRate);
            this.policy.validateAmount(newAmount);

            // Resolve new category if changed
            let newCategory = original.category;
            if (dto.newCategoryId && dto.newCategoryId !== original.category?.id) {
                newCategory = await categoryRepo.findOne({
                    where: { id: dto.newCategoryId },
                });
                if (!newCategory) throw new NotFoundException('La nueva categoría no fue encontrada.');
            }

            const correction = txRepo.create({
                churchId: dto.churchId,
                type: original.type, // Same type as original
                description: dto.newDescription || original.description,
                amount: newAmount,
                amountBaseCurrency: newAmount * newExchangeRate,
                currency: original.currency,
                exchangeRate: newExchangeRate,
                sourceAccount: dto.newSourceAccountId
                    ? lockedAccounts.get(dto.newSourceAccountId) || null
                    : original.sourceAccount,
                destinationAccount: dto.newDestinationAccountId
                    ? lockedAccounts.get(dto.newDestinationAccountId) || null
                    : original.destinationAccount,
                category: newCategory,
                ministry: original.ministry,
                status: TransactionStatus.COMPLETED,
                createdById: dto.userId,
                isCorrection: true,
                isInvalidated: false, // FINAL CORRECTION is valid for reports
                correctedTransactionId: original.id,
                date: correctionDate,
            });

            // Apply correction balance impact
            this.applyBalanceImpact(correction, lockedAccounts);
            const savedCorrection = await txRepo.save(correction);

            // Save updated account balances after correction
            for (const account of lockedAccounts.values()) {
                await accountRepo.save(account);
            }

            // 6. Audit log — full CORRECT snapshot
            await auditRepo.save(auditRepo.create({
                churchId: dto.churchId,
                entityType: AuditEntityType.TRANSACTION,
                entityId: original.id,
                action: AuditAction.CORRECT,
                before: snapshotTransaction(original),
                after: {
                    original: snapshotTransaction(original),
                    reversal: snapshotTransaction(savedReversal),
                    correction: snapshotTransaction(savedCorrection),
                    reason: dto.reason,
                },
                entityVersion: 'v1',
                performedByUserId: dto.userId,
                performedByEmail: dto.userEmail || null,
                performedByRole: dto.userRole || null,
                ipAddress: dto.ipAddress || null,
                reason: dto.reason,
            }));

            return { reversal: savedReversal, correction: savedCorrection };
        });
    }

    /**
     * Invert transaction type for reversal.
     * INCOME ↔ EXPENSE, TRANSFER stays TRANSFER (but source/dest swapped)
     */
    private invertType(type: TransactionType): TransactionType {
        if (type === TransactionType.INCOME) return TransactionType.EXPENSE;
        if (type === TransactionType.EXPENSE) return TransactionType.INCOME;
        return TransactionType.TRANSFER;
    }

    /**
     * Apply balance changes based on transaction type.
     * Mutates account balances in the locked map.
     */
    private applyBalanceImpact(
        tx: TreasuryTransaction,
        accounts: Map<string, Account>,
    ): void {
        const amount = Number(tx.amount);

        if (tx.type === TransactionType.EXPENSE && tx.sourceAccount) {
            const account = accounts.get(tx.sourceAccount.id);
            if (account) account.balance = Number(account.balance) - amount;
        }

        if (tx.type === TransactionType.INCOME && tx.destinationAccount) {
            const account = accounts.get(tx.destinationAccount.id);
            if (account) account.balance = Number(account.balance) + amount;
        }

        if (tx.type === TransactionType.TRANSFER) {
            if (tx.sourceAccount) {
                const src = accounts.get(tx.sourceAccount.id);
                if (src) src.balance = Number(src.balance) - amount;
            }
            if (tx.destinationAccount) {
                const dest = accounts.get(tx.destinationAccount.id);
                if (dest) {
                    const destAmount = amount * Number(tx.exchangeRate);
                    dest.balance = Number(dest.balance) + destAmount;
                }
            }
        }
    }
}
