import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { BudgetAllocation } from '../entities/budget-allocation.entity';
import { BudgetPeriod } from '../entities/budget-period.entity';
import { CreateBudgetAllocationDto } from '../dto/create-budget-allocation.dto';
import { Church } from '../../churches/entities/church.entity';

@Injectable()
export class CreateBudgetAllocationUseCase {
    constructor(
        @InjectRepository(BudgetAllocation)
        private readonly budgetAllocationRepository: Repository<BudgetAllocation>,
        @InjectRepository(BudgetPeriod)
        private readonly budgetPeriodRepository: Repository<BudgetPeriod>,
    ) { }

    async execute(dto: CreateBudgetAllocationDto, churchId: string): Promise<BudgetAllocation> {
        // 1. Validate Target (Ministry OR Category)
        if (!dto.ministryId && !dto.categoryId) {
            throw new BadRequestException('At least one of Ministry or Category must be specified');
        }

        // 2. Validate Period existence and ownership
        const period = await this.budgetPeriodRepository.findOne({
            where: { id: dto.budgetPeriodId, church: { id: churchId } },
        });

        if (!period) {
            throw new NotFoundException('Budget Period not found');
        }

        // 3. Create Allocation
        // Check for duplicates (Period + Ministry + Category must be unique)
        const existingAllocation = await this.budgetAllocationRepository.findOne({
            where: {
                budgetPeriod: { id: dto.budgetPeriodId },
                ministry: dto.ministryId ? { id: dto.ministryId } : IsNull(),
                category: dto.categoryId ? { id: dto.categoryId } : IsNull(),
                church: { id: churchId },
            }
        });

        if (existingAllocation) {
            throw new BadRequestException('Ya existe una asignación presupuestaria para esta combinación de Ministerio y Categoría en este periodo.');
        }

        try {
            const allocation = this.budgetAllocationRepository.create({
                amountBaseCurrency: dto.amount,
                budgetPeriod: { id: dto.budgetPeriodId },
                ministry: dto.ministryId ? { id: dto.ministryId } : null,
                category: dto.categoryId ? { id: dto.categoryId } : null,
                church: { id: churchId } as Church,
            });

            return await this.budgetAllocationRepository.save(allocation);
        } catch (error: any) {
            if (error.code === '23505') { // Postgres duplicate key code
                throw new BadRequestException('Budget Allocation for this Ministry/Category already exists in this Period');
            }
            throw error;
        }
    }
}
