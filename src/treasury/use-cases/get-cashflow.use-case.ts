import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TreasuryTransaction } from '../entities/treasury-transaction.entity';
import { TransactionType, TransactionStatus } from '../enums/treasury.enums';

@Injectable()
export class GetCashflowUseCase {
    constructor(private readonly dataSource: DataSource) { }

    async execute(churchId: string, startDate: string, endDate: string) {
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
            .where('tx.churchId = :churchId', { churchId })
            .andWhere('tx.date BETWEEN :startDate AND :endDate', { startDate, endDate })
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
