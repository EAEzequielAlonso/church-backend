import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, SelectQueryBuilder } from 'typeorm';
import { TreasuryTransaction } from '../entities/treasury-transaction.entity';
import { TransactionType } from '../enums/treasury.enums';

export interface GetTransactionsFilterDto {
  startDate?: Date;
  endDate?: Date;
  type?: string; // 'INCOME' | 'EXPENSE' | 'TRANSFER'
  status?: string; // 'completed' | 'pending_approval' | 'rejected'
  categoryId?: string;
  accountId?: string;
  withDeleted?: boolean;
  includeHistory?: boolean;
  limit?: number;
  offset?: number;
}

@Injectable()
export class GetTransactionsUseCase {
  constructor(
    @InjectRepository(TreasuryTransaction)
    private readonly txRepo: Repository<TreasuryTransaction>,
  ) {}

  async execute(churchId: string, filters: GetTransactionsFilterDto = {}) {
    const query = this.txRepo
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.sourceAccount', 'source')
      .leftJoinAndSelect('tx.destinationAccount', 'dest')
      .leftJoinAndSelect('tx.category', 'category')
      .leftJoinAndSelect('tx.ministry', 'ministry')
      .leftJoinAndSelect('tx.church', 'church')
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

    if (filters.status) {
      query.andWhere('tx.status = :status', { status: filters.status });
    }

    if (filters.categoryId) {
      query.andWhere('tx.category.id = :categoryId', {
        categoryId: filters.categoryId,
      });
    }

    if (filters.accountId) {
      query.andWhere(
        '(tx.sourceAccount.id = :accountId OR tx.destinationAccount.id = :accountId)',
        { accountId: filters.accountId },
      );
    }

    // Phase 18: Filter out invalidated transactions unless history is requested
    if (filters.includeHistory) {
        // Show everything (no filter on isInvalidated)
    } else {
        query.andWhere('tx.isInvalidated = false');
    }

    if (filters.withDeleted) {
      query.withDeleted().andWhere('tx.deletedAt IS NOT NULL');
    } else {
      // Default TypeORM behavior handles deletedAt IS NULL
    }

    query.orderBy('tx.date', 'DESC');

    if (filters.limit) {
      query.take(filters.limit);
    }

    if (filters.offset) {
      query.skip(filters.offset);
    }

    const [data, total] = await query.getManyAndCount();

    // Attach baseCurrency from Church to satisfy UI TreasuryTransactionDto mapping
    const enhancedData = data.map((tx) => ({
      ...tx,
      baseCurrency: tx.church?.baseCurrency,
    }));

    return {
      data: enhancedData,
      meta: {
        total,
        page:
          filters.offset && filters.limit
            ? Math.floor(filters.offset / filters.limit) + 1
            : 1,
        lastPage: filters.limit ? Math.ceil(total / filters.limit) : 1,
        limit: filters.limit,
      },
    };
  }
}
