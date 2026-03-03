import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsOptional,
  IsDecimal,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BudgetPeriodType } from '../entities/budget-period.entity';
import { Currency } from '../../treasury/enums/treasury.enums';

export class CreateBudgetPeriodDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(BudgetPeriodType)
  @IsNotEmpty()
  type: BudgetPeriodType;

  @IsDateString()
  @IsNotEmpty()
  startDate: string; // ISO Date

  @IsDateString()
  @IsNotEmpty()
  endDate: string; // ISO Date

  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;
}

export class UpdateBudgetPeriodDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
