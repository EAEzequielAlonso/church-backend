import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BudgetAllocation } from '../entities/budget-allocation.entity';
import { BudgetPeriod } from '../entities/budget-period.entity';
import { TreasuryTransaction } from '../../treasury/entities/treasury-transaction.entity';
import {
  TransactionType,
  TransactionStatus,
} from '../../treasury/enums/treasury.enums';

// ── Response Interfaces ──

export interface AllocationMonthlyBreakdown {
  month: string; // "2026-01"
  amount: number;
}

export interface AllocationExecution {
  allocationId: string;
  type: TransactionType;
  ministry: { id: string; name: string } | null;
  category: { id: string; name: string; type: string } | null;
  allocatedAmount: number;
  executedAmount: number;
  remainingAmount: number;
  usagePercentage: number;
  status: 'OK' | 'WARNING_80' | 'EXCEEDED';
  notes: string | null;
  monthlyBreakdown: AllocationMonthlyBreakdown[];
}

export interface CoherenceSummary {
  totalIncomeBudgeted: number;
  totalExpenseBudgeted: number;
  totalIncomeActual: number;
  totalExpenseActual: number;
  projectedBalance: number;
  actualBalance: number;
}

export interface BudgetExecutionResponse {
  period: {
    id: string;
    name: string;
    type: string;
    status: string;
    startDate: Date;
    endDate: Date;
    description: string | null;
  };
  coherence: CoherenceSummary;
  allocations: AllocationExecution[];
}

// ── Use Case ──

@Injectable()
export class GetBudgetExecutionUseCase {
  constructor(
    @InjectRepository(BudgetPeriod)
    private readonly budgetPeriodRepository: Repository<BudgetPeriod>,
    @InjectRepository(BudgetAllocation)
    private readonly budgetAllocationRepository: Repository<BudgetAllocation>,
    private readonly dataSource: DataSource,
  ) { }

  async execute(
    churchId: string,
    periodId: string,
  ): Promise<BudgetExecutionResponse> {
    // 1. Load period
    const period = await this.budgetPeriodRepository.findOne({
      where: { id: periodId, churchId },
    });

    if (!period) {
      throw new NotFoundException('Período presupuestario no encontrado.');
    }

    // 2. Load allocations with relations
    const allocations = await this.budgetAllocationRepository.find({
      where: { budgetPeriodId: periodId, churchId },
      relations: ['ministry', 'category'],
      order: { type: 'ASC', amountBaseCurrency: 'DESC' },
    });

    // 3. Single aggregated query: transactions grouped by (type, ministryId, categoryId, year-month)
    //    Filters: churchId, date range, COMPLETED, not deleted, NOT transfer
    const rawStats: Array<{
      type: string;
      ministryId: string | null;
      categoryId: string | null;
      txYear: string;
      txMonth: string;
      total: string;
    }> = await this.dataSource
      .createQueryBuilder(TreasuryTransaction, 't')
      .select('t.type', 'type')
      .addSelect('t.ministryId', 'ministryId')
      .addSelect('t.categoryId', 'categoryId')
      .addSelect('EXTRACT(YEAR FROM t.date)::int', 'txYear')
      .addSelect('EXTRACT(MONTH FROM t.date)::int', 'txMonth')
      .addSelect('SUM(t.amountBaseCurrency)', 'total')
      .where('t.churchId = :churchId', { churchId })
      .andWhere('t.date >= :startDate', { startDate: period.startDate })
      .andWhere('t.date <= :endDate', { endDate: period.endDate })
      .andWhere('t.type IN (:...types)', {
        types: [TransactionType.INCOME, TransactionType.EXPENSE],
      })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .andWhere('t.deletedAt IS NULL')
      .groupBy('t.type')
      .addGroupBy('t.ministryId')
      .addGroupBy('t.categoryId')
      .addGroupBy('EXTRACT(YEAR FROM t.date)')
      .addGroupBy('EXTRACT(MONTH FROM t.date)')
      .getRawMany();

    // 4. Build lookup: key → { total, monthly[] }
    //    Key format: "type|ministryId|categoryId"
    const statsMap = new Map<
      string,
      { total: number; monthly: Map<string, number> }
    >();

    for (const row of rawStats) {
      const key = `${row.type}|${row.ministryId || ''}|${row.categoryId || ''}`;
      const amount = parseFloat(row.total || '0');
      const monthKey = `${row.txYear}-${String(row.txMonth).padStart(2, '0')}`;

      if (!statsMap.has(key)) {
        statsMap.set(key, { total: 0, monthly: new Map() });
      }

      const entry = statsMap.get(key)!;
      entry.total += amount;
      entry.monthly.set(
        monthKey,
        (entry.monthly.get(monthKey) || 0) + amount,
      );
    }

    // 5. Map allocations to execution results
    let totalIncomeBudgeted = 0;
    let totalExpenseBudgeted = 0;
    let totalIncomeActual = 0;
    let totalExpenseActual = 0;

    const allocationResults: AllocationExecution[] = allocations.map(
      (allocation) => {
        const allocatedAmount = Number(allocation.amountBaseCurrency);
        const txType = allocation.type; // 'income' | 'expense'

        // Build lookup key matching this allocation
        const key = `${txType}|${allocation.ministryId || ''}|${allocation.categoryId || ''}`;
        const stats = statsMap.get(key);

        const executedAmount = stats
          ? Math.round(stats.total * 100) / 100
          : 0;
        const remainingAmount =
          Math.round((allocatedAmount - executedAmount) * 100) / 100;
        const usagePercentage =
          allocatedAmount > 0
            ? Math.round((executedAmount / allocatedAmount) * 10000) / 100
            : 0;

        // Status
        let status: 'OK' | 'WARNING_80' | 'EXCEEDED';
        if (executedAmount > allocatedAmount) {
          status = 'EXCEEDED';
        } else if (usagePercentage >= 80) {
          status = 'WARNING_80';
        } else {
          status = 'OK';
        }

        // Monthly breakdown
        const monthlyBreakdown: AllocationMonthlyBreakdown[] = [];
        if (stats) {
          const sortedMonths = Array.from(stats.monthly.entries()).sort(
            ([a], [b]) => a.localeCompare(b),
          );
          for (const [month, amount] of sortedMonths) {
            monthlyBreakdown.push({
              month,
              amount: Math.round(amount * 100) / 100,
            });
          }
        }

        // Accumulate coherence totals
        if (txType === TransactionType.INCOME) {
          totalIncomeBudgeted += allocatedAmount;
          totalIncomeActual += executedAmount;
        } else if (txType === TransactionType.EXPENSE) {
          totalExpenseBudgeted += allocatedAmount;
          totalExpenseActual += executedAmount;
        }

        return {
          allocationId: allocation.id,
          type: txType,
          ministry: allocation.ministry
            ? { id: allocation.ministry.id, name: allocation.ministry.name }
            : null,
          category: allocation.category
            ? {
              id: allocation.category.id,
              name: allocation.category.name,
              type: allocation.category.type,
            }
            : null,
          allocatedAmount,
          executedAmount,
          remainingAmount,
          usagePercentage,
          status,
          notes: allocation.notes || null,
          monthlyBreakdown,
        };
      },
    );

    // 6. Build response
    return {
      period: {
        id: period.id,
        name: period.name,
        type: period.type,
        status: period.status,
        startDate: period.startDate,
        endDate: period.endDate,
        description: period.description || null,
      },
      coherence: {
        totalIncomeBudgeted: Math.round(totalIncomeBudgeted * 100) / 100,
        totalExpenseBudgeted: Math.round(totalExpenseBudgeted * 100) / 100,
        totalIncomeActual: Math.round(totalIncomeActual * 100) / 100,
        totalExpenseActual: Math.round(totalExpenseActual * 100) / 100,
        projectedBalance:
          Math.round((totalIncomeBudgeted - totalExpenseBudgeted) * 100) / 100,
        actualBalance:
          Math.round((totalIncomeActual - totalExpenseActual) * 100) / 100,
      },
      allocations: allocationResults,
    };
  }
}
