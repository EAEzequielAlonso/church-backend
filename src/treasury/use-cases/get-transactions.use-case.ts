import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, SelectQueryBuilder } from 'typeorm';
import { TreasuryTransaction } from '../entities/treasury-transaction.entity';
import { TransactionType } from '../enums/treasury.enums';

export interface GetTransactionsFilterDto {
    startDate?: Date;
    endDate?: Date;
    type?: string; // 'INCOME' | 'EXPENSE' | 'TRANSFER'
    categoryId?: string;
    accountId?: string;
    withDeleted?: boolean;
    limit?: number;
    offset?: number;
}

@Injectable()
export class GetTransactionsUseCase {
    constructor(
        @InjectRepository(TreasuryTransaction)
        private readonly txRepo: Repository<TreasuryTransaction>
    ) { }

    async execute(churchId: string, filters: GetTransactionsFilterDto = {}) {
        const query = this.txRepo.createQueryBuilder('tx')
            .leftJoinAndSelect('tx.sourceAccount', 'source')
            .leftJoinAndSelect('tx.destinationAccount', 'dest')
            .leftJoinAndSelect('tx.category', 'category')
            .leftJoinAndSelect('tx.ministry', 'ministry')
            .where('tx.churchId = :churchId', { churchId });

        if (filters.startDate) {
            query.andWhere('tx.date >= :startDate', { startDate: filters.startDate });
        }

        if (filters.endDate) {
            // End of day
            const end = new Date(filters.endDate);
            end.setHours(23, 59, 59, 999);
            query.andWhere('tx.date <= :endDate', { endDate: end });
        }

        if (filters.type) {
            query.andWhere('tx.type = :type', { type: filters.type });
        }

        if (filters.categoryId) {
            query.andWhere('tx.category.id = :categoryId', { categoryId: filters.categoryId });
        }

        if (filters.accountId) {
            query.andWhere('(tx.sourceAccount.id = :accountId OR tx.destinationAccount.id = :accountId)', { accountId: filters.accountId });
        }

        if (filters.withDeleted) {
            query.withDeleted().andWhere('tx.deletedAt IS NOT NULL');
        } else {
            // Default TypeORM behavior handles deletedAt IS NULL unless withDeleted() is called, 
            // but explicit check is safer if logic varies.
            // Actually, query builder requires explicit deleted check if we want to EXCLUDE them when soft delete is enabled?
            // TypeORM QueryBuilder defaults to NOT showing deleted. 'withDeleted()' enables them.
        }

        query.orderBy('tx.date', 'DESC');

        if (filters.limit) {
            query.take(filters.limit);
        }

        if (filters.offset) {
            query.skip(filters.offset);
        }

        const [data, total] = await query.getManyAndCount();

        return {
            data,
            meta: {
                total,
                page: filters.offset && filters.limit ? Math.floor(filters.offset / filters.limit) + 1 : 1,
                lastPage: filters.limit ? Math.ceil(total / filters.limit) : 1,
                limit: filters.limit
            }
        };
    }
}
