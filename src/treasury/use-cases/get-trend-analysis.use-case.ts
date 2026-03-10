import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TreasuryTransaction } from '../entities/treasury-transaction.entity';
import { TransactionType, TransactionStatus } from '../enums/treasury.enums';

@Injectable()
export class GetTrendAnalysisUseCase {
    constructor(private readonly dataSource: DataSource) { }

    async execute(churchId: string, months: number = 12) {
        const sinceDate = new Date();
        sinceDate.setMonth(sinceDate.getMonth() - months);

        return this.dataSource
            .getRepository(TreasuryTransaction)
            .createQueryBuilder('tx')
            .select("TO_CHAR(tx.date, 'YYYY-MM')", 'month')
            .addSelect(
                "SUM(CASE WHEN tx.type = :income THEN tx.amountBaseCurrency ELSE 0 END)",
                'income',
            )
            .addSelect(
                "SUM(CASE WHEN tx.type = :expense THEN tx.amountBaseCurrency ELSE 0 END)",
                'expense',
            )
            .addSelect(
                "SUM(CASE WHEN tx.type = :income THEN tx.amountBaseCurrency ELSE 0 END) - " +
                "SUM(CASE WHEN tx.type = :expense THEN tx.amountBaseCurrency ELSE 0 END)",
                'net',
            )
            .where('tx.churchId = :churchId', { churchId })
            .andWhere('tx.date >= :since', { since: sinceDate.toISOString() })
            .andWhere('tx.status = :status', { status: TransactionStatus.COMPLETED })
            .andWhere('tx.deletedAt IS NULL')
            .setParameters({
                income: TransactionType.INCOME,
                expense: TransactionType.EXPENSE,
            })
            .groupBy("TO_CHAR(tx.date, 'YYYY-MM')")
            .orderBy('month', 'ASC')
            .getRawMany();
    }
}
