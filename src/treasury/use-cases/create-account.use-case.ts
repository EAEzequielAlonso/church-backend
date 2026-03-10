import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Account } from '../entities/account.entity';
import { TreasuryAuditLog } from '../entities/treasury-audit-log.entity';
import { CreateAccountDto } from '../dto/account.dto';
import { AuditEntityType, AuditAction } from '../enums/treasury.enums';
import { snapshotAccount } from '../helpers/audit-snapshot.helper';

@Injectable()
export class CreateAccountUseCase {
    constructor(private readonly dataSource: DataSource) { }

    async execute(
        dto: CreateAccountDto,
        churchId: string,
        userId?: string,
        userRole?: string,
        userEmail?: string,
        ipAddress?: string,
    ) {
        return this.dataSource.transaction(async (manager) => {
            const accountRepo = manager.getRepository(Account);
            const auditRepo = manager.getRepository(TreasuryAuditLog);

            const account = accountRepo.create({
                name: dto.name,
                type: dto.type,
                currency: dto.currency,
                churchId,
            });
            const saved = await accountRepo.save(account);

            if (userId) {
                await auditRepo.save(auditRepo.create({
                    churchId,
                    entityType: AuditEntityType.ACCOUNT,
                    entityId: saved.id,
                    action: AuditAction.CREATE,
                    before: null,
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
