import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TreasuryPolicy } from '../policies/treasury.policy';
import { TreasuryTransaction } from '../entities/treasury-transaction.entity';
import { TransactionStatus } from '../enums/treasury.enums';
import { Account } from '../entities/account.entity';
import { AccountType } from '../../common/enums';
import { TreasuryAuditLog } from '../entities/treasury-audit-log.entity';

interface UpdateTransactionDto {
    id: string;
    churchId: string;
    userId: string;
    description?: string;
    amount?: number;
    sourceAccountId?: string;
    destinationAccountId?: string;
    ministryId?: string;
    reason?: string;
}

@Injectable()
export class UpdateTransactionUseCase {
    constructor(
        private readonly dataSource: DataSource,
        private readonly policy: TreasuryPolicy
    ) { }

    async execute(dto: UpdateTransactionDto): Promise<TreasuryTransaction> {
        return this.dataSource.transaction(async (manager) => {
            const txRepo = manager.getRepository(TreasuryTransaction);
            const accountRepo = manager.getRepository(Account);
            const auditRepo = manager.getRepository(TreasuryAuditLog);

            // 1. Fetch Existing (Scoped)
            const tx = await txRepo.findOne({
                where: { id: dto.id, church: { id: dto.churchId } },
                relations: ['sourceAccount', 'destinationAccount']
            });

            if (!tx) throw new NotFoundException('Transacción no encontrada.');

            this.policy.canModifyTransaction(tx);
            if (dto.amount) this.policy.validateAmount(dto.amount);

            // Capture state for Audit/Revert
            const oldAmount = Number(tx.amount);
            const oldDescription = tx.description;
            const oldSource = tx.sourceAccount;
            const oldDest = tx.destinationAccount;

            const newAmount = dto.amount !== undefined ? Number(dto.amount) : oldAmount;

            // 2. Revert Previous Balance
            // ONLY if completed
            if (tx.status === TransactionStatus.COMPLETED) {
                if (oldSource.type === AccountType.ASSET) {
                    oldSource.balance = Number(oldSource.balance) + oldAmount;
                    await accountRepo.save(oldSource);
                }
                if (oldDest.type === AccountType.ASSET) {
                    oldDest.balance = Number(oldDest.balance) - (oldAmount * Number(tx.exchangeRate));
                    await accountRepo.save(oldDest);
                }
            }

            // 3. Update Fields & Fetch New Accounts
            if (dto.description) tx.description = dto.description;
            tx.amount = newAmount;
            if (dto.ministryId !== undefined) tx.ministry = dto.ministryId ? { id: dto.ministryId } as any : null;

            let finalSource = oldSource;
            let finalDest = oldDest;

            // If Source Changed
            if (dto.sourceAccountId && dto.sourceAccountId !== oldSource.id) {
                const newSource = await accountRepo.findOne({ where: { id: dto.sourceAccountId, church: { id: dto.churchId } } });
                if (!newSource) throw new NotFoundException('Nueva cuenta de origen no encontrada.');
                finalSource = newSource;
                tx.sourceAccount = finalSource;
            } else {
                // Must reload source to get updated balance from step 2 if it was the same account
                finalSource = await accountRepo.findOneBy({ id: oldSource.id });
            }

            // If Dest Changed
            if (dto.destinationAccountId && dto.destinationAccountId !== oldDest.id) {
                const newDest = await accountRepo.findOne({ where: { id: dto.destinationAccountId, church: { id: dto.churchId } } });
                if (!newDest) throw new NotFoundException('Nueva cuenta de destino no encontrada.');
                finalDest = newDest;
                tx.destinationAccount = finalDest;
            } else {
                // Reload
                finalDest = await accountRepo.findOneBy({ id: oldDest.id });
            }

            this.policy.validateTransactionFlow(finalSource, finalDest);

            // 4. Apply New Balance
            if (tx.status === TransactionStatus.COMPLETED) {
                if (finalSource.type === AccountType.ASSET) {
                    finalSource.balance = Number(finalSource.balance) - newAmount;
                    await accountRepo.save(finalSource);
                }
                if (finalDest.type === AccountType.ASSET) {
                    finalDest.balance = Number(finalDest.balance) + (newAmount * Number(tx.exchangeRate));
                    await accountRepo.save(finalDest);
                }
            }

            // 5. Audit
            let changeDetails = dto.reason || 'Edición';
            const changes = [];

            if (finalSource.id !== oldSource.id) {
                changes.push(`${oldSource.name} -> ${finalSource.name}`);
            }
            if (finalDest.id !== oldDest.id) {
                changes.push(`${oldDest.name} -> ${finalDest.name}`);
            }

            if (changes.length > 0) {
                changeDetails += `. Cambios: ${changes.join(', ')}.`;
            }

            const audit = auditRepo.create({
                transaction: tx,
                oldAmount,
                newAmount,
                oldDescription,
                newDescription: tx.description,
                changedBy: { id: dto.userId } as any,
                changeReason: changeDetails
            });
            await auditRepo.save(audit);

            return await txRepo.save(tx);
        });
    }
}
