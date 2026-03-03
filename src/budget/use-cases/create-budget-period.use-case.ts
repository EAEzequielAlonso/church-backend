import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  BudgetPeriod,
  BudgetPeriodType,
} from '../entities/budget-period.entity';
import { CreateBudgetPeriodDto } from '../dto/create-budget-period.dto';
import { Church } from '../../churches/entities/church.entity';

@Injectable()
export class CreateBudgetPeriodUseCase {
  constructor(
    @InjectRepository(BudgetPeriod)
    private readonly budgetPeriodRepository: Repository<BudgetPeriod>,
    private readonly dataSource: DataSource,
  ) {}

  async execute(
    dto: CreateBudgetPeriodDto,
    churchId: string,
  ): Promise<BudgetPeriod> {
    return this.dataSource.transaction(async (manager) => {
      const periodRepo = manager.getRepository(BudgetPeriod);

      // 1. Validate Dates
      const start = new Date(dto.startDate);
      const end = new Date(dto.endDate);
      if (start > end) {
        throw new BadRequestException('Start date must be before end date');
      }

      // 2. Check for Overlaps (Same Type, Same Church)
      // Overlap logic: (StartA <= EndB) and (EndA >= StartB)
      const overlap = await periodRepo
        .createQueryBuilder('bp')
        .where('bp.churchId = :churchId', { churchId })
        .andWhere('bp.type = :type', { type: dto.type })
        .andWhere('bp.startDate <= :end', { end: dto.endDate })
        .andWhere('bp.endDate >= :start', { start: dto.startDate })
        .getOne();

      if (overlap) {
        throw new BadRequestException(
          `Budget Period overlaps with existing period: ${overlap.name}`,
        );
      }

      // 3. Create
      const period = periodRepo.create({
        ...dto,
        church: { id: churchId } as Church,
      });

      return periodRepo.save(period);
    });
  }
}
