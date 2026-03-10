import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Budget } from '../entities/budget.entity';
import { TreasuryTransaction } from '../entities/treasury-transaction.entity';
import { TransactionStatus, BudgetLineType } from '../enums/treasury.enums';

export interface BudgetExecutionLine {
    lineId: string;
    type: BudgetLineType;
    ministryId: string | null;
    ministryName: string | null;
    categoryId: string | null;
    categoryName: string | null;
    budgetedAmount: number;
    actualAmount: number;
    executionPercentage: number;
    status: 'OK' | 'WARNING_80' | 'EXCEEDED';
}

@Injectable()
export class GetBudgetExecutionUseCase {
    constructor(private readonly dataSource: DataSource) { }

    async execute(churchId: string, year: number, month: number) {
        const budgetRepo = this.dataSource.getRepository(Budget);
        const txRepo = this.dataSource.getRepository(TreasuryTransaction);

        // 1. Load budget with lines
        const budget = await budgetRepo.findOne({
            where: { churchId, year, month },
            relations: ['lines', 'lines.ministry', 'lines.category'],
        });
        if (!budget) throw new NotFoundException('Presupuesto no encontrado para este período.');

        // 2. Period date range
        const periodStart = new Date(year, month - 1, 1);
        const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);

        // 3. Batch query: GROUP BY (type, ministryId, categoryId) for all actuals
        const actuals = await txRepo
            .createQueryBuilder('tx')
            .select('tx.type', 'type')
            .addSelect('tx.ministryId', 'ministryId')
            .addSelect('tx.categoryId', 'categoryId')
            .addSelect('SUM(tx.amountBaseCurrency)', 'total')
            .where('tx.churchId = :churchId', { churchId })
            .andWhere('tx.date >= :start', { start: periodStart })
            .andWhere('tx.date <= :end', { end: periodEnd })
            .andWhere('tx.status = :status', { status: TransactionStatus.COMPLETED })
            .andWhere('tx.deletedAt IS NULL')
            .groupBy('tx.type')
            .addGroupBy('tx.ministryId')
            .addGroupBy('tx.categoryId')
            .getRawMany();

        // 4. Build lookup map: "type|ministryId|categoryId" → total
        const actualMap = new Map<string, number>();
        for (const row of actuals) {
            const key = `${row.type}|${row.ministryId || ''}|${row.categoryId || ''}`;
            actualMap.set(key, parseFloat(row.total || '0'));
        }

        // 5. Calculate execution for each line
        const lines: BudgetExecutionLine[] = budget.lines.map((line) => {
            const txType = line.type === BudgetLineType.INCOME ? 'income' : 'expense';
            let actualAmount = 0;

            // Sum all matching actuals for this line's criteria
            for (const [key, total] of actualMap) {
                const [type, minId, catId] = key.split('|');
                if (type !== txType) continue;

                const matchMinistry = !line.ministryId || minId === line.ministryId;
                const matchCategory = !line.categoryId || catId === line.categoryId;

                if (matchMinistry && matchCategory) {
                    actualAmount += total;
                }
            }

            const budgeted = Number(line.budgetedAmount);
            const pct = budgeted > 0 ? (actualAmount / budgeted) * 100 : 0;

            let status: 'OK' | 'WARNING_80' | 'EXCEEDED';
            if (actualAmount > budgeted) {
                status = 'EXCEEDED';
            } else if (pct >= 80) {
                status = 'WARNING_80';
            } else {
                status = 'OK';
            }

            return {
                lineId: line.id,
                type: line.type,
                ministryId: line.ministryId,
                ministryName: line.ministry?.name || null,
                categoryId: line.categoryId,
                categoryName: line.category?.name || null,
                budgetedAmount: budgeted,
                actualAmount: Math.round(actualAmount * 100) / 100,
                executionPercentage: Math.round(pct * 100) / 100,
                status,
            };
        });

        // 6. Actual income total for the month
        const incomeTotalRow = await txRepo
            .createQueryBuilder('tx')
            .select('SUM(tx.amountBaseCurrency)', 'total')
            .where('tx.churchId = :churchId', { churchId })
            .andWhere('tx.date >= :start', { start: periodStart })
            .andWhere('tx.date <= :end', { end: periodEnd })
            .andWhere('tx.type = :type', { type: 'income' })
            .andWhere('tx.status = :status', { status: TransactionStatus.COMPLETED })
            .andWhere('tx.deletedAt IS NULL')
            .getRawOne();

        return {
            budget: {
                id: budget.id,
                year: budget.year,
                month: budget.month,
                projectedIncomeTotal: Number(budget.projectedIncomeTotal),
                actualIncomeTotal: parseFloat(incomeTotalRow?.total || '0'),
            },
            lines,
        };
    }
}
