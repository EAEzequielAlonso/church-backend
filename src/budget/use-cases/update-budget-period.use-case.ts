import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BudgetPeriod } from '../entities/budget-period.entity';
import { UpdateBudgetPeriodDto } from '../dto/update-budget-period.dto';

@Injectable()
export class UpdateBudgetPeriodUseCase {
  constructor(
    @InjectRepository(BudgetPeriod)
    private readonly budgetPeriodRepository: Repository<BudgetPeriod>,
  ) {}

  async execute(
    id: string,
    dto: UpdateBudgetPeriodDto,
    churchId: string,
  ): Promise<BudgetPeriod> {
    const period = await this.budgetPeriodRepository.findOne({
      where: { id, churchId: churchId },
    });

    if (!period) {
      throw new NotFoundException(
        'Periodo presupuestario no encontrado o no tienes acceso.',
      );
    }

    Object.assign(period, dto);
    return await this.budgetPeriodRepository.save(period);
  }
}
