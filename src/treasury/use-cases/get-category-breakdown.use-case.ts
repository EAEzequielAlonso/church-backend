import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TreasuryTransaction } from '../entities/treasury-transaction.entity';
import { TransactionType, TransactionStatus } from '../enums/treasury.enums';

@Injectable()
export class GetCategoryBreakdownUseCase {
    constructor(private readonly dataSource: DataSource) { }

    async execute(
        churchId: string,
        startDate: string,
        endDate: string,
        type: TransactionType,
    ) {
        return this.dataSource
            .getRepository(TreasuryTransaction)
            .createQueryBuilder('tx')
            .leftJoin('tx.category', 'cat')
            .select('cat.name', 'name')
            .addSelect('cat.color', 'color')
            .addSelect('SUM(tx.amountBaseCurrency)', 'value')
            .where('tx.churchId = :churchId', { churchId })
            .andWhere('tx.type = :type', { type })
            .andWhere('tx.date BETWEEN :startDate AND :endDate', { startDate, endDate })
            .andWhere('tx.status = :status', { status: TransactionStatus.COMPLETED })
            .andWhere('tx.deletedAt IS NULL')
            .groupBy('cat.id')
            .addGroupBy('cat.name')
            .addGroupBy('cat.color')
            .orderBy('value', 'DESC')
            .getRawMany();
    }
}
