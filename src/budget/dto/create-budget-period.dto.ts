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
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name: string;

  @IsEnum(BudgetPeriodType, { message: 'El tipo de período no es válido' })
  @IsNotEmpty({ message: 'El tipo de período es requerido' })
  type: BudgetPeriodType;

  @IsDateString({}, { message: 'La fecha de inicio no es una fecha válida (ISO)' })
  @IsNotEmpty({ message: 'La fecha de inicio es requerida' })
  startDate: string; // ISO Date

  @IsDateString({}, { message: 'La fecha de fin no es una fecha válida (ISO)' })
  @IsNotEmpty({ message: 'La fecha de fin es requerida' })
  endDate: string; // ISO Date

  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  description?: string;

  @IsEnum(Currency, { message: 'La moneda no es válida' })
  @IsOptional()
  currency?: Currency;
}

export class UpdateBudgetPeriodDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsOptional()
  name?: string;

  @IsDateString({}, { message: 'La fecha de inicio no es una fecha válida (ISO)' })
  @IsOptional()
  startDate?: string;

  @IsDateString({}, { message: 'La fecha de fin no es una fecha válida (ISO)' })
  @IsOptional()
  endDate?: string;
}
