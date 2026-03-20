import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClosedPeriod } from '../entities/closed-period.entity';

@Injectable()
export class GetPeriodStatusUseCase {
  constructor(
    @InjectRepository(ClosedPeriod)
    private readonly closedPeriodRepo: Repository<ClosedPeriod>,
  ) {}

  async execute(churchId: string, year: number, month: number) {
    const closed = await this.closedPeriodRepo.findOne({
      where: { churchId, year, month },
    });

    if (closed) {
      return {
        id: closed.id,
        churchId: closed.churchId,
        year: closed.year,
        month: closed.month,
        status: closed.isClosed ? 'CLOSED' : 'OPEN',
        closedAt: closed.closedAt?.toISOString() || null,
        closedByUserId: closed.closedById || null,
        snapshot: closed.isClosed ? {
            totalIncome: Number(closed.totalIncome || 0),
            totalExpense: Number(closed.totalExpense || 0),
            transactionCount: 0,
            budgetedIncome: 0,
            budgetedExpense: 0
        } : null,
        createdAt: closed.closedAt?.toISOString() || new Date().toISOString(),
        updatedAt: closed.reopenedAt?.toISOString() || new Date().toISOString(),
      };
    }

    // Default open period when nothing is closed
    return {
      id: `open-${churchId}-${year}-${month}`,
      churchId,
      year,
      month,
      status: 'OPEN',
      closedAt: null,
      closedByUserId: null,
      snapshot: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
