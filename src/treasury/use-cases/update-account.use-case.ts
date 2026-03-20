import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Account } from '../entities/account.entity';
import { TreasuryTransaction } from '../entities/treasury-transaction.entity';
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
            const txRepo = manager.getRepository(TreasuryTransaction);
            const auditRepo = manager.getRepository(TreasuryAuditLog);

            const account = await accountRepo.findOne({
                where: { id, churchId },
            });
            if (!account) throw new NotFoundException('Cuenta no encontrada');

            // 1. Validate type/currency changes if transactions exist
            const changingSensitiveFields =
                (dto.type && dto.type !== account.type) ||
                (dto.currency && dto.currency !== account.currency);

            if (changingSensitiveFields) {
                const hasTransactions = await txRepo.count({
                    where: [{ sourceAccount: { id } }, { destinationAccount: { id } }],
                });

                if (hasTransactions > 0) {
                    throw new BadRequestException(
                        'No se puede cambiar el tipo o la moneda de una cuenta que ya tiene movimientos financieros.',
                    );
                }
            }

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
