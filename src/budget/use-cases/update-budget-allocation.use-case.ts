import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BudgetAllocation } from '../entities/budget-allocation.entity';
import { UpdateBudgetAllocationDto } from '../dto/update-budget-allocation.dto';

@Injectable()
export class UpdateBudgetAllocationUseCase {
  constructor(
    @InjectRepository(BudgetAllocation)
    private readonly budgetAllocationRepository: Repository<BudgetAllocation>,
  ) {}

  async execute(
    id: string,
    dto: UpdateBudgetAllocationDto,
    churchId: string,
  ): Promise<BudgetAllocation> {
    const allocation = await this.budgetAllocationRepository.findOne({
      where: { id, churchId: churchId },
    });

    if (!allocation) {
      throw new NotFoundException('Asignación no encontrada');
    }

    // Only allow updating amount for now, as changing keys (ministry/category) might cause conflicts
    // and is better handled by delete+create or more complex logic.
    // For simple edit, let's allow updating amount.
    if (dto.amount) {
      allocation.amountBaseCurrency = dto.amount;
    }

    return this.budgetAllocationRepository.save(allocation);
  }
}
