import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Budget } from '../entities/budget.entity';
import { BudgetLine } from '../entities/budget-line.entity';
import { CreateBudgetDto } from '../dto/budget.dto';
import { TreasuryAuditLog } from '../entities/treasury-audit-log.entity';
import { AuditEntityType, AuditAction } from '../enums/treasury.enums';

@Injectable()
export class CreateBudgetUseCase {
    constructor(private readonly dataSource: DataSource) { }

    async execute(
        dto: CreateBudgetDto,
        churchId: string,
        userId: string,
        userRole?: string,
        userEmail?: string,
        ipAddress?: string,
    ) {
        // Validate lines
        if (!dto.lines || dto.lines.length === 0) {
            throw new BadRequestException('El presupuesto debe tener al menos una línea.');
        }

        for (const line of dto.lines) {
            if (!line.ministryId && !line.categoryId) {
                throw new BadRequestException(
                    'Cada línea presupuestaria debe tener al menos un ministerio o una categoría.',
                );
            }
        }

        return this.dataSource.transaction(async (manager) => {
            const budgetRepo = manager.getRepository(Budget);
            const lineRepo = manager.getRepository(BudgetLine);

            // Check uniqueness
            const existing = await budgetRepo.findOne({
                where: { churchId, year: dto.year, month: dto.month },
            });
            if (existing) {
                throw new BadRequestException(
                    `Ya existe un presupuesto para ${dto.year}-${String(dto.month).padStart(2, '0')}.`,
                );
            }

            // Create budget header
            const budget = budgetRepo.create({
                churchId,
                year: dto.year,
                month: dto.month,
                projectedIncomeTotal: dto.projectedIncomeTotal,
                notes: dto.notes || null,
            });
            const savedBudget = await budgetRepo.save(budget);

            // Create lines
            const lines = dto.lines.map((l) =>
                lineRepo.create({
                    budget: savedBudget,
                    type: l.type,
                    ministryId: l.ministryId || null,
                    categoryId: l.categoryId || null,
                    budgetedAmount: l.budgetedAmount,
                }),
            );
            savedBudget.lines = await lineRepo.save(lines);

            // Audit
            const auditRepo = manager.getRepository(TreasuryAuditLog);
            await auditRepo.save(auditRepo.create({
                churchId,
                entityType: AuditEntityType.BUDGET,
                entityId: savedBudget.id,
                action: AuditAction.CREATE,
                before: null,
                after: {
                    id: savedBudget.id,
                    year: savedBudget.year,
                    month: savedBudget.month,
                    projectedIncomeTotal: savedBudget.projectedIncomeTotal,
                    lines: savedBudget.lines.map(l => ({
                        id: l.id,
                        type: l.type,
                        amount: l.budgetedAmount,
                        categoryId: l.categoryId,
                        ministryId: l.ministryId
                    }))
                },
                entityVersion: 'v1',
                performedByUserId: userId,
                performedByEmail: userEmail || null,
                performedByRole: userRole || null,
                ipAddress: ipAddress || null,
                reason: dto.reason || null,
            }));

            return savedBudget;
        });
    }
}
