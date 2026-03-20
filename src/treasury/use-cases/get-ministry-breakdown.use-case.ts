import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TreasuryTransaction } from '../entities/treasury-transaction.entity';
import { TransactionType, TransactionStatus } from '../enums/treasury.enums';

@Injectable()
export class GetMinistryBreakdownUseCase {
    constructor(private readonly dataSource: DataSource) { }

    async execute(churchId: string, startDate: string, endDate: string) {
        return this.dataSource
            .getRepository(TreasuryTransaction)
            .createQueryBuilder('tx')
            .leftJoin('tx.ministry', 'min')
            .select('min.name', 'name')
            .addSelect('SUM(tx.amountBaseCurrency)', 'value')
            .where('tx.churchId = :churchId', { churchId })
            .andWhere('tx.type = :type', { type: TransactionType.EXPENSE })
            .andWhere('tx.date BETWEEN :startDate AND :endDate', { startDate, endDate })
            .andWhere('tx.status = :status', { status: TransactionStatus.COMPLETED })
            .andWhere('tx.isInvalidated = false')
            .andWhere('tx.deletedAt IS NULL')
            .andWhere('tx.ministryId IS NOT NULL')
            .groupBy('min.id')
            .addGroupBy('min.name')
            .orderBy('value', 'DESC')
            .getRawMany();
    }
}
