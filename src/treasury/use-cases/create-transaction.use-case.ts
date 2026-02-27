import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TreasuryPolicy } from '../policies/treasury.policy';
import { TreasuryTransaction } from '../entities/treasury-transaction.entity';
import { TransactionStatus, AccountType, Currency, TransactionType } from '../enums/treasury.enums';
import { Account } from '../entities/account.entity';
import { TransactionCategory } from '../entities/transaction-category.entity';
import { Budget } from '../entities/budget.entity';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { TreasuryAuditLog } from '../entities/treasury-audit-log.entity';

@Injectable()
export class CreateTransactionUseCase {
    constructor(
        private readonly dataSource: DataSource,
        private readonly treasuryPolicy: TreasuryPolicy,
    ) { }

    async execute(data: CreateTransactionDto & { userId: string, churchId: string }): Promise<TreasuryTransaction> {
        return this.dataSource.transaction(async (manager) => {
            const txRepo = manager.getRepository(TreasuryTransaction);
            const accountRepo = manager.getRepository(Account);
            const categoryRepo = manager.getRepository(TransactionCategory);
            const auditRepo = manager.getRepository(TreasuryAuditLog);

            // 1. Validate Transaction Type & Inputs
            if (data.type === TransactionType.INCOME) {
                if (!data.destinationAccountId) throw new BadRequestException('Destination Account required for Income');
                if (!data.categoryId) throw new BadRequestException('Category required for Income');
            } else if (data.type === TransactionType.EXPENSE) {
                if (!data.sourceAccountId) throw new BadRequestException('Source Account required for Expense');
                if (!data.categoryId) throw new BadRequestException('Category required for Expense');
            } else if (data.type === TransactionType.TRANSFER) {
                if (!data.sourceAccountId || !data.destinationAccountId) throw new BadRequestException('Source and Destination Accounts required for Transfer');
            }

            // 2. Fetch Entities
            let sourceAccount: Account | null = null;
            let destinationAccount: Account | null = null;
            let category: TransactionCategory | null = null;

            if (data.sourceAccountId) {
                sourceAccount = await accountRepo.findOne({ where: { id: data.sourceAccountId, church: { id: data.churchId } } });
                if (!sourceAccount) throw new NotFoundException('Source Account not found or does not belong to this church.');
            }

            if (data.destinationAccountId) {
                destinationAccount = await accountRepo.findOne({ where: { id: data.destinationAccountId, church: { id: data.churchId } } });
                if (!destinationAccount) throw new NotFoundException('Destination Account not found or does not belong to this church.');
            }

            if (data.categoryId) {
                category = await categoryRepo.findOne({ where: { id: data.categoryId } });
                if (!category) throw new NotFoundException('Category not found');
                // Validate Category Type matches Transaction Type
                if (category.type !== data.type) throw new BadRequestException(`Category type mismatch. Expected ${data.type}`);
            }

            // Apply policy validations
            this.treasuryPolicy.validateAmount(data.amount);
            if (sourceAccount && destinationAccount) {
                this.treasuryPolicy.validateTransactionFlow(sourceAccount, destinationAccount);
            }

            // 3. Budget Check (Domain Logic)
            let status = TransactionStatus.COMPLETED;
            if (data.type === TransactionType.EXPENSE && data.ministryId) {
                const limit = 500000;
                if (data.amount > limit) status = TransactionStatus.PENDING_APPROVAL;
            }

            // 4. Create Transaction Record
            const tx = txRepo.create({
                church: { id: data.churchId },
                description: data.description,
                amount: data.amount,
                amountBaseCurrency: data.amount * (data.exchangeRate || 1), // Calculate Base Currency!
                currency: data.currency || Currency.ARS,
                exchangeRate: data.exchangeRate || 1,
                sourceAccount: sourceAccount,
                destinationAccount: destinationAccount,
                category: category,
                ministry: data.ministryId ? { id: data.ministryId } : null,
                status,
                type: data.type,
                createdById: data.userId,
                date: typeof data.date === 'string' ? new Date(data.date) : (data.date || new Date())
            });

            // 5. Update Balances
            if (status === TransactionStatus.COMPLETED) {
                const amountVal = Number(tx.amount);

                // Expense: Source decreases
                if (sourceAccount && tx.type === TransactionType.EXPENSE) {
                    sourceAccount.balance = Number(sourceAccount.balance) - amountVal;
                    await accountRepo.save(sourceAccount);
                    tx.balanceAfter = Number(sourceAccount.balance); // Track integrity
                }
                // Income: Dest increases
                else if (destinationAccount && tx.type === TransactionType.INCOME) {
                    destinationAccount.balance = Number(destinationAccount.balance) + amountVal;
                    await accountRepo.save(destinationAccount);
                    tx.balanceAfter = Number(destinationAccount.balance);
                }
                // Transfer: Source decreases, Dest increases
                else if (sourceAccount && destinationAccount && tx.type === TransactionType.TRANSFER) {
                    sourceAccount.balance = Number(sourceAccount.balance) - amountVal;
                    await accountRepo.save(sourceAccount);

                    // Convert if cross-currency? Assuming same currency for MVP or handling exchange rate
                    // If exchange rate provided, dest amount = amount * rate
                    const destAmount = amountVal * Number(tx.exchangeRate);
                    destinationAccount.balance = Number(destinationAccount.balance) + destAmount;
                    await accountRepo.save(destinationAccount);

                    tx.balanceAfter = Number(sourceAccount.balance);
                }
            }

            return await txRepo.save(tx);
        });
    }
}
