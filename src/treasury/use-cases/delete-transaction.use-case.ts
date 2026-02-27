import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TreasuryPolicy } from '../policies/treasury.policy';
import { TreasuryTransaction } from '../entities/treasury-transaction.entity';
import { TransactionStatus } from '../enums/treasury.enums';
import { TreasuryAuditLog } from '../entities/treasury-audit-log.entity'; // Import AuditLog
import { Account } from '../entities/account.entity';
import { AccountType } from '../../common/enums';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class DeleteTransactionUseCase {
    constructor(
        private readonly dataSource: DataSource,
        private readonly policy: TreasuryPolicy
    ) { }

    async execute(id: string, churchId: string, userId: string): Promise<{ success: boolean }> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const txRepo = queryRunner.manager.getRepository(TreasuryTransaction);
            const accountRepo = queryRunner.manager.getRepository(Account);
            const auditRepo = queryRunner.manager.getRepository(TreasuryAuditLog);

            if (!userId) throw new BadRequestException('No se identificó al usuario que realiza la acción.');

            const tx = await txRepo.findOne({
                where: { id, church: { id: churchId } },
                relations: ['sourceAccount', 'destinationAccount']
            });

            if (!tx) throw new NotFoundException('La transacción no fue encontrada o no pertenece a esta iglesia.');

            // Revert Balance
            if (tx.status === TransactionStatus.COMPLETED) {
                if (tx.sourceAccount && tx.sourceAccount.type === AccountType.ASSET) {
                    tx.sourceAccount.balance = Number(tx.sourceAccount.balance) + Number(tx.amount);
                    await accountRepo.save(tx.sourceAccount);
                }

                if (tx.destinationAccount && tx.destinationAccount.type === AccountType.ASSET) {
                    const destAmount = Number(tx.amount) * Number(tx.exchangeRate);
                    tx.destinationAccount.balance = Number(tx.destinationAccount.balance) - destAmount;
                    await accountRepo.save(tx.destinationAccount);
                }
            }

            // Audit Log for Deletion
            // Ensure userId is valid, otherwise log as system or unknown?
            // transforming userId to User object for TypeORM
            const userRef = { id: userId } as User;

            const audit = auditRepo.create({
                transaction: tx,
                oldAmount: Number(tx.amount),
                newAmount: 0,
                oldDescription: tx.description,
                newDescription: 'ELIMINADO',
                changedBy: userRef,
                changeReason: 'Transacción eliminada'
            });
            await auditRepo.save(audit);

            // Soft Delete
            await txRepo.softRemove(tx);

            await queryRunner.commitTransaction();
            return { success: true };

        } catch (err) {
            await queryRunner.rollbackTransaction();
            if (err instanceof NotFoundException || err instanceof BadRequestException) throw err;

            // Detailed logging for debugging
            console.error('[DeleteTransactionUseCase] Fatal Error:', err);

            // Throw a more technical but still Spanish error if it's a known database issue
            if (err.code === '23503') { // Foreign key violation
                throw new BadRequestException('No se puede eliminar la transacción porque está siendo utilizada en otro registro.');
            }

            throw new BadRequestException(`Error al eliminar (debug): ${err.message || 'Error desconocido'}`);
        } finally {
            await queryRunner.release();
        }
    }
}
