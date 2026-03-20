import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BudgetAllocation } from '../entities/budget-allocation.entity';

@Injectable()
export class DeleteBudgetAllocationUseCase {
  constructor(
    @InjectRepository(BudgetAllocation)
    private readonly budgetAllocationRepository: Repository<BudgetAllocation>,
  ) {}

  async execute(id: string, churchId: string): Promise<void> {
    const result = await this.budgetAllocationRepository.delete({
      id,
      church: { id: churchId },
    });

    if (result.affected === 0) {
      throw new NotFoundException('Asignación no encontrada');
    }
  }
}
