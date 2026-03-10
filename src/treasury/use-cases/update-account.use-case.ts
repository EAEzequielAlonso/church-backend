import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Account } from '../entities/account.entity';
import { TreasuryAuditLog } from '../entities/treasury-audit-log.entity';
import { UpdateAccountDto } from '../dto/account.dto';
import { AuditEntityType, AuditAction } from '../enums/treasury.enums';
import { snapshotAccount } from '../helpers/audit-snapshot.helper';

@Injectable()
export class UpdateAccountUseCase {
    constructor(private readonly dataSource: DataSource) { }

    async execute(
        id: string,
        churchId: string,
        dto: UpdateAccountDto,
        userId?: string,
        userRole?: string,
        userEmail?: string,
        ipAddress?: string,
    ) {
        return this.dataSource.transaction(async (manager) => {
            const accountRepo = manager.getRepository(Account);
            const auditRepo = manager.getRepository(TreasuryAuditLog);

            const account = await accountRepo.findOne({
                where: { id, churchId },
            });
            if (!account) throw new NotFoundException('Account not found');

            const beforeSnapshot = snapshotAccount(account);

            Object.assign(account, dto);
            const saved = await accountRepo.save(account);

            if (userId) {
                await auditRepo.save(auditRepo.create({
                    churchId,
                    entityType: AuditEntityType.ACCOUNT,
                    entityId: saved.id,
                    action: AuditAction.UPDATE,
                    before: beforeSnapshot,
                    after: snapshotAccount(saved),
                    entityVersion: 'v1',
                    performedByUserId: userId,
                    performedByEmail: userEmail || null,
                    performedByRole: userRole || null,
                    ipAddress: ipAddress || null,
                }));
            }

            return saved;
        });
    }
}
