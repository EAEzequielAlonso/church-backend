import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TreasuryTransaction } from '../entities/treasury-transaction.entity';
import { TransactionType, TransactionStatus } from '../enums/treasury.enums';

@Injectable()
export class GetSummaryUseCase {
    constructor(private readonly dataSource: DataSource) { }

    async execute(churchId: string, startDate: string, endDate: string) {
        const txRepo = this.dataSource.getRepository(TreasuryTransaction);

        // Current period
        const result = await txRepo
            .createQueryBuilder('tx')
            .select(
                "SUM(CASE WHEN tx.type = :income THEN tx.amountBaseCurrency ELSE 0 END)",
                'totalIncome',
            )
            .addSelect(
                "SUM(CASE WHEN tx.type = :expense THEN tx.amountBaseCurrency ELSE 0 END)",
                'totalExpense',
            )
            .where('tx.churchId = :churchId', { churchId })
            .andWhere('tx.date BETWEEN :startDate AND :endDate', { startDate, endDate })
            .andWhere('tx.status = :status', { status: TransactionStatus.COMPLETED })
            .andWhere('tx.deletedAt IS NULL')
            .setParameters({
                income: TransactionType.INCOME,
                expense: TransactionType.EXPENSE,
            })
            .getRawOne();

        const income = parseFloat(result?.totalIncome || '0');
        const expense = parseFloat(result?.totalExpense || '0');

        // Previous period (same duration before)
        const start = new Date(startDate);
        const end = new Date(endDate);
        const duration = end.getTime() - start.getTime();
        const prevStart = new Date(start.getTime() - duration);
        const prevEnd = new Date(end.getTime() - duration);

        const prevResult = await txRepo
            .createQueryBuilder('tx')
            .select(
                "SUM(CASE WHEN tx.type = :income THEN tx.amountBaseCurrency ELSE 0 END)",
                'totalIncome',
            )
            .addSelect(
                "SUM(CASE WHEN tx.type = :expense THEN tx.amountBaseCurrency ELSE 0 END)",
                'totalExpense',
            )
            .where('tx.churchId = :churchId', { churchId })
            .andWhere('tx.date BETWEEN :prevStart AND :prevEnd', {
                prevStart: prevStart.toISOString(),
                prevEnd: prevEnd.toISOString(),
            })
            .andWhere('tx.status = :status', { status: TransactionStatus.COMPLETED })
            .andWhere('tx.deletedAt IS NULL')
            .setParameters({
                income: TransactionType.INCOME,
                expense: TransactionType.EXPENSE,
            })
            .getRawOne();

        const prevIncome = parseFloat(prevResult?.totalIncome || '0');
        const prevExpense = parseFloat(prevResult?.totalExpense || '0');
        const prevNet = prevIncome - prevExpense;

        return {
            income: {
                value: income,
                previous: prevIncome,
                change: this.calcChange(income, prevIncome),
            },
            expense: {
                value: expense,
                previous: prevExpense,
                change: this.calcChange(expense, prevExpense),
            },
            net: {
                value: income - expense,
                previous: prevNet,
                change: this.calcChange(income - expense, prevNet),
            },
        };
    }

    private calcChange(current: number, previous: number): number {
        if (previous === 0) return current === 0 ? 0 : 100;
        return Math.round(((current - previous) / Math.abs(previous)) * 10000) / 100;
    }
}
