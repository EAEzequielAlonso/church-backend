import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BudgetPeriod } from '../entities/budget-period.entity';

@Injectable()
export class DeleteBudgetPeriodUseCase {
  constructor(
    @InjectRepository(BudgetPeriod)
    private readonly budgetPeriodRepository: Repository<BudgetPeriod>,
  ) {}

  async execute(id: string, churchId: string): Promise<void> {
    const period = await this.budgetPeriodRepository.findOne({
      where: { id, church: { id: churchId } },
    });

    if (!period) {
      throw new NotFoundException(
        'Periodo presupuestario no encontrado o no tienes acceso.',
      );
    }

    await this.budgetPeriodRepository.remove(period);
  }
}
