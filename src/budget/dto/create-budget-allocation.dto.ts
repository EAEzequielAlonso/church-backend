import {
  IsUUID,
  IsNumber,
  Min,
  IsOptional,
  IsEnum,
  IsString,
} from 'class-validator';
import { TransactionType } from '../../treasury/enums/treasury.enums';

export class CreateBudgetAllocationDto {
  @IsUUID('4', { message: 'El ID del período presupuestario no es un UUID válido' })
  budgetPeriodId: string;

  @IsUUID('4', { message: 'El ID del ministerio no es un UUID válido' })
  @IsOptional()
  ministryId?: string;

  @IsUUID('4', { message: 'El ID de la categoría no es un UUID válido' })
  @IsOptional()
  categoryId?: string;

  @IsEnum(TransactionType, { message: 'El tipo de asignación no es válido' })
  type: TransactionType;

  @IsNumber({}, { message: 'El monto debe ser un número' })
  @Min(0.01, { message: 'El monto mínimo es 0.01' })
  amount: number;

  @IsOptional()
  @IsString({ message: 'Las notas deben ser una cadena de texto' })
  notes?: string;
}

export class UpdateBudgetAllocationDto {
  @IsNumber({}, { message: 'El monto debe ser un número' })
  @Min(0.01, { message: 'El monto mínimo es 0.01' })
  amount: number;
}
