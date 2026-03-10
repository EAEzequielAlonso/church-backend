import {
    Injectable,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ClosedPeriod } from '../entities/closed-period.entity';
import { PeriodAccountSnapshot } from '../entities/period-account-snapshot.entity';
import { TreasuryAuditLog } from '../entities/treasury-audit-log.entity';
import { AuditEntityType, AuditAction } from '../enums/treasury.enums';
import { snapshotPeriod } from '../helpers/audit-snapshot.helper';

export interface ReopenPeriodDto {
    churchId: string;
    userId: string;
    year: number;
    month: number;
    reason: string;
}

@Injectable()
export class ReopenPeriodUseCase {
    constructor(private readonly dataSource: DataSource) { }

    async execute(dto: ReopenPeriodDto): Promise<ClosedPeriod> {
        if (!dto.reason || dto.reason.trim().length === 0) {
            throw new BadRequestException(
                'Debe proporcionar un motivo para reabrir el período.',
            );
        }

        return this.dataSource.transaction(async (manager) => {
            const periodRepo = manager.getRepository(ClosedPeriod);
            const snapshotRepo = manager.getRepository(PeriodAccountSnapshot);

            // 1. Load period
            const period = await periodRepo.findOne({
                where: {
                    churchId: dto.churchId,
                    year: dto.year,
                    month: dto.month,
                },
            });

            if (!period) {
                throw new NotFoundException(
                    `No existe período cerrado para ${dto.year}-${String(dto.month).padStart(2, '0')}.`,
                );
            }

            if (!period.isClosed) {
                throw new BadRequestException('Este período ya está abierto.');
            }

            // 2. Capture before state
            const beforeSnapshot = snapshotPeriod(period);

            // 3. Mark as reopened
            period.isClosed = false;
            period.reopenedById = dto.userId;
            period.reopenedAt = new Date();
            period.reopenReason = dto.reason;

            // 4. Delete snapshots
            await snapshotRepo.delete({ closedPeriod: { id: period.id } });

            // 5. Save
            const saved = await periodRepo.save(period);

            // 6. Audit log
            const auditRepo = manager.getRepository(TreasuryAuditLog);
            await auditRepo.save(auditRepo.create({
                churchId: dto.churchId,
                entityType: AuditEntityType.PERIOD,
                entityId: period.id,
                action: AuditAction.REOPEN_PERIOD,
                before: beforeSnapshot,
                after: snapshotPeriod(saved),
                entityVersion: 'v1',
                performedByUserId: dto.userId,
                performedByEmail: null,
                performedByRole: null,
                ipAddress: null,
            }));

            return saved;
        });
    }
}
