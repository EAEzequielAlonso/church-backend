import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BudgetAllocation } from '../entities/budget-allocation.entity';
import { BudgetPeriod } from '../entities/budget-period.entity';
import { TransactionCategory } from '../../treasury/entities/transaction-category.entity';
import { CreateBudgetAllocationDto } from '../dto/create-budget-allocation.dto';

@Injectable()
export class CreateBudgetAllocationUseCase {
  constructor(
    @InjectRepository(BudgetAllocation)
    private readonly budgetAllocationRepository: Repository<BudgetAllocation>,
    @InjectRepository(BudgetPeriod)
    private readonly budgetPeriodRepository: Repository<BudgetPeriod>,
  ) { }

  async execute(
    dto: CreateBudgetAllocationDto,
    churchId: string,
  ): Promise<BudgetAllocation> {
    // 1. Validate Target (Ministry OR Category)
    if (!dto.ministryId && !dto.categoryId) {
      throw new BadRequestException(
        'Al menos un Ministerio o una Categoría debe ser especificado.',
      );
    }

    // 2. Validate Period existence and ownership
    const period = await this.budgetPeriodRepository.findOne({
      where: { id: dto.budgetPeriodId, churchId },
    });

    if (!period) {
      throw new NotFoundException('Período presupuestario no encontrado.');
    }

    // 3. Validate category type matches allocation type
    if (dto.categoryId) {
      const categoryRepo =
        this.budgetAllocationRepository.manager.getRepository(
          TransactionCategory,
        );
      const category = await categoryRepo.findOne({
        where: { id: dto.categoryId, churchId },
      });

      if (!category) {
        throw new NotFoundException('Categoría no encontrada.');
      }

      if (category.type !== dto.type) {
        throw new BadRequestException(
          `El tipo de la asignación (${dto.type}) no coincide con el tipo de la categoría "${category.name}" (${category.type}).`,
        );
      }
    }

    // 4. Check for duplicates (Period + Ministry + Category + Type must be unique)
    const existingAllocation = await this.budgetAllocationRepository.findOne({
      where: {
        budgetPeriodId: dto.budgetPeriodId,
        ministryId: dto.ministryId || null,
        categoryId: dto.categoryId || null,
        type: dto.type,
        churchId,
      },
    });

    if (existingAllocation) {
      throw new BadRequestException(
        'Ya existe una asignación presupuestaria para esta combinación de Ministerio, Categoría y Tipo en este período.',
      );
    }

    // 5. Create allocation
    try {
      const allocation = this.budgetAllocationRepository.create({
        amountBaseCurrency: dto.amount,
        budgetPeriodId: dto.budgetPeriodId,
        ministryId: dto.ministryId || null,
        categoryId: dto.categoryId || null,
        type: dto.type,
        notes: dto.notes || null,
        churchId,
      });

      return await this.budgetAllocationRepository.save(allocation);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new BadRequestException(
          'Ya existe una asignación presupuestaria con esta combinación en este período.',
        );
      }
      throw error;
    }
  }
}

