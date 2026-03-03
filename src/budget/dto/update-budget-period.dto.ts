import { PartialType } from '@nestjs/mapped-types';
import { CreateBudgetPeriodDto } from './create-budget-period.dto';

export class UpdateBudgetPeriodDto extends PartialType(CreateBudgetPeriodDto) {}
