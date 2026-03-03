import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BudgetPeriod } from '../entities/budget-period.entity';

@Injectable()
export class GetBudgetPeriodsUseCase {
  constructor(
    @InjectRepository(BudgetPeriod)
    private readonly budgetPeriodRepository: Repository<BudgetPeriod>,
  ) {}

  async execute(churchId: string, year?: number): Promise<BudgetPeriod[]> {
    const query = this.budgetPeriodRepository
      .createQueryBuilder('bp')
      .where('bp.churchId = :churchId', { churchId })
      .orderBy('bp.startDate', 'DESC');

    if (year) {
      // Filter by periods that intersect with the year
      const startOfYear = `${year}-01-01`;
      const endOfYear = `${year}-12-31`;
      query
        .andWhere('bp.startDate <= :endOfYear', { endOfYear })
        .andWhere('bp.endDate >= :startOfYear', { startOfYear });
    }

    return query.getMany();
  }
}
