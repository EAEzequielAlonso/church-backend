import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BudgetAllocation } from '../entities/budget-allocation.entity';

@Injectable()
export class GetBudgetAllocationsUseCase {
    constructor(
        @InjectRepository(BudgetAllocation)
        private readonly budgetAllocationRepository: Repository<BudgetAllocation>,
    ) { }

    async execute(churchId: string, periodId: string): Promise<BudgetAllocation[]> {
        return this.budgetAllocationRepository.find({
            where: {
                church: { id: churchId },
                budgetPeriod: { id: periodId },
            },
            relations: ['ministry', 'category'],
            order: {
                amountBaseCurrency: 'DESC',
            },
        });
    }
}
