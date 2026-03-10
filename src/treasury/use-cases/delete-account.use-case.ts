import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Account } from '../entities/account.entity';
import { TreasuryTransaction } from '../entities/treasury-transaction.entity';
import { TreasuryAuditLog } from '../entities/treasury-audit-log.entity';
import { AuditEntityType, AuditAction } from '../enums/treasury.enums';
import { snapshotAccount } from '../helpers/audit-snapshot.helper';

@Injectable()
export class DeleteAccountUseCase {
    constructor(private readonly dataSource: DataSource) { }

    async execute(
        id: string,
        churchId: string,
        userId?: string,
        userRole?: string,
        userEmail?: string,
        ipAddress?: string,
    ) {
        return this.dataSource.transaction(async (manager) => {
            const accountRepo = manager.getRepository(Account);
            const txRepo = manager.getRepository(TreasuryTransaction);
            const auditRepo = manager.getRepository(TreasuryAuditLog);

            const account = await accountRepo.findOne({
                where: { id, churchId },
            });
            if (!account) throw new NotFoundException('Account not found');

            const hasTransactions = await txRepo.count({
                where: [{ sourceAccount: { id } }, { destinationAccount: { id } }],
            });
            if (hasTransactions > 0)
                throw new BadRequestException('Cannot delete account with transactions.');

            const beforeSnapshot = snapshotAccount(account);

            await accountRepo.remove(account);

            if (userId) {
                await auditRepo.save(auditRepo.create({
                    churchId,
                    entityType: AuditEntityType.ACCOUNT,
                    entityId: id,
                    action: AuditAction.DELETE,
                    before: beforeSnapshot,
                    after: null,
                    entityVersion: 'v1',
                    performedByUserId: userId,
                    performedByEmail: userEmail || null,
                    performedByRole: userRole || null,
                    ipAddress: ipAddress || null,
                }));
            }

            return { success: true };
        });
    }
}
