import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Budget } from '../entities/budget.entity';
import { BudgetLine } from '../entities/budget-line.entity';
import { ClosedPeriod } from '../entities/closed-period.entity';
import { TreasuryAuditLog } from '../entities/treasury-audit-log.entity';
import { AuditEntityType, AuditAction } from '../enums/treasury.enums';

@Injectable()
export class DeleteBudgetUseCase {
    constructor(private readonly dataSource: DataSource) { }

    async execute(
        id: string,
        churchId: string,
        userId: string,
        userRole?: string,
        userEmail?: string,
        ipAddress?: string,
        reason?: string,
    ) {
        return this.dataSource.transaction(async (manager) => {
            const budgetRepo = manager.getRepository(Budget);
            const periodRepo = manager.getRepository(ClosedPeriod);

            const budget = await budgetRepo.findOne({
                where: { id, churchId },
                relations: ['lines']
            });
            if (!budget) throw new NotFoundException('Presupuesto no encontrado.');

            // Block if period is closed
            const closedPeriod = await periodRepo.findOne({
                where: { churchId, year: budget.year, month: budget.month, isClosed: true },
            });
            if (closedPeriod) {
                throw new BadRequestException(
                    `No se puede eliminar el presupuesto del período ${budget.year}-${String(budget.month).padStart(2, '0')} porque está cerrado.`,
                );
            }

            // Audit Log
            const auditRepo = manager.getRepository(TreasuryAuditLog);
            await auditRepo.save(auditRepo.create({
                churchId,
                entityType: AuditEntityType.BUDGET,
                entityId: id,
                action: AuditAction.DELETE,
                before: {
                    id: budget.id,
                    year: budget.year,
                    month: budget.month,
                    projectedIncomeTotal: budget.projectedIncomeTotal,
                    lines: budget.lines?.map(l => ({
                        id: l.id,
                        type: l.type,
                        amount: l.budgetedAmount,
                        categoryId: l.categoryId,
                        ministryId: l.ministryId
                    }))
                },
                after: null,
                entityVersion: 'v1',
                performedByUserId: userId,
                performedByEmail: userEmail || null,
                performedByRole: userRole || null,
                ipAddress: ipAddress || null,
                reason: reason || null,
            }));

            // CASCADE will delete lines
            await budgetRepo.remove(budget);
            return { success: true };
        });
    }
}
