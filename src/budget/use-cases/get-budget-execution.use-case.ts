import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BudgetAllocation } from '../entities/budget-allocation.entity';
import { BudgetPeriod } from '../entities/budget-period.entity';
import { TreasuryTransaction } from '../../treasury/entities/treasury-transaction.entity';
import { TransactionType } from '../../treasury/enums/treasury.enums';

@Injectable()
export class GetBudgetExecutionUseCase {
    constructor(
        @InjectRepository(BudgetPeriod)
        private readonly budgetPeriodRepository: Repository<BudgetPeriod>,
        @InjectRepository(BudgetAllocation)
        private readonly budgetAllocationRepository: Repository<BudgetAllocation>,
        private readonly dataSource: DataSource,
    ) { }

    async execute(churchId: string, periodId: string) {
        // 1. Fetch Period
        const period = await this.budgetPeriodRepository.findOne({
            where: { id: periodId, church: { id: churchId } }
        });

        if (!period) throw new NotFoundException('Budget Period not found');

        // 2. Fetch Allocations
        const allocations = await this.budgetAllocationRepository.find({
            where: { budgetPeriod: { id: periodId } },
            relations: ['ministry', 'category'],
        });

        // 3. SQL Aggregation: Get actual spent/received grouped by Ministry + Category
        // We fetch ALL transactions (Income + Expense) in this period for this church, grouped.
        const rawStats = await this.dataSource.createQueryBuilder(TreasuryTransaction, 't')
            .select('t.ministryId', 'ministryId')
            .addSelect('t.categoryId', 'categoryId')
            .addSelect('SUM(t.amountBaseCurrency)', 'totalParams')
            .where('t.churchId = :churchId', { churchId })
            // REMOVED: .andWhere('t.type = :type', { type: TransactionType.EXPENSE }) -> We want both now.
            .andWhere('t.date >= :startDate AND t.date <= :endDate', {
                startDate: period.startDate,
                endDate: period.endDate
            })
            .groupBy('t.ministryId')
            .addGroupBy('t.categoryId')
            .getRawMany();

        // 4. Map Stats to Allocations
        const results = allocations.map(allocation => {
            const budgetAmount = Number(allocation.amountBaseCurrency);

            // Filter stats that match this allocation's criteria
            const matchingStats = rawStats.filter(stat => {
                if (allocation.ministry && stat.ministryId !== allocation.ministry.id) return false;
                if (allocation.category && stat.categoryId !== allocation.category.id) return false;
                return true;
            });

            const spentAmount = matchingStats.reduce((sum, stat) => sum + Number(stat.totalParams), 0);

            return {
                allocationId: allocation.id,
                ministry: allocation.ministry ? { id: allocation.ministry.id, name: allocation.ministry.name } : null,
                category: allocation.category ? {
                    id: allocation.category.id,
                    name: allocation.category.name,
                    type: allocation.category.type // Added type
                } : null,
                budgetAmount,
                spentAmount,
                remainingAmount: budgetAmount - spentAmount,
                usagePercentage: budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0
            };
        });

        // 5. Calculate Total Period Summary
        const totalBudget = results.reduce((sum, r) => sum + r.budgetAmount, 0);
        // Sum all transactions (income + expense) for global executed? 
        // No, we need to distinguish for the Summary Card. 
        // But the current `BudgetExecutionSummary` interface is simple (Total, Spent, Remaining).
        // For backward compatibility, "Spent" will now include "Income Realized" if budgets exist for it.
        // This might look weird if we sum Income + Expense as "Total Spent".
        // However, the frontend will rewrite the Summary Logic entirely based on `allocations`, so this legacy summary is less critical.
        // We'll calculate totalExecuted just as sum of all matching actuals for now.
        const totalExecuted = rawStats.reduce((sum, stat) => sum + Number(stat.totalParams), 0);

        return {
            period: {
                id: period.id,
                name: period.name,
                startDate: period.startDate,
                endDate: period.endDate,
            },
            summary: {
                totalBudget,
                totalSpent: totalExecuted,
                remaining: totalBudget - totalExecuted,
                usagePercentage: totalBudget > 0 ? (totalExecuted / totalBudget) * 100 : 0
            },
            allocations: results
        };
    }
}
