import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Currency, TransactionType } from '../enums/treasury.enums';

export class CreateTransactionDto {
  @IsEnum(TransactionType, { message: 'El tipo de transacción no es válido' })
  @IsNotEmpty({ message: 'El tipo de transacción es requerido' })
  type: TransactionType;

  @IsNumber({}, { message: 'El monto debe ser un número' })
  @Min(0.01, { message: 'El monto mínimo es 0.01' })
  @IsNotEmpty({ message: 'El monto es requerido' })
  amount: number;

  @IsEnum(Currency, { message: 'La moneda no es válida' })
  @IsNotEmpty({ message: 'La moneda es requerida' })
  currency: Currency;

  @IsNumber({}, { message: 'El tipo de cambio debe ser un número' })
  @Min(0.00000001, { message: 'El tipo de cambio debe ser mayor a 0' })
  @IsOptional()
  exchangeRate?: number; // Defaults to 1 if not provided

  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La descripción es requerida' })
  description: string;

  @IsOptional()
  @IsString({ message: 'La referencia debe ser una cadena de texto' })
  reference?: string;

  @IsOptional()
  @IsString({ message: 'La fecha debe ser una cadena de texto (ISO)' })
  date?: string; // ISO Date string

  // --- Relationships ---

  @IsOptional()
  @IsUUID('4', { message: 'El ID de la cuenta origen no es un UUID válido' })
  sourceAccountId?: string; // Required for EXPENSE, TRANSFER

  @IsOptional()
  @IsUUID('4', { message: 'El ID de la cuenta destino no es un UUID válido' })
  destinationAccountId?: string; // Required for INCOME, TRANSFER

  @IsOptional()
  @IsUUID('4', { message: 'El ID de la categoría no es un UUID válido' })
  categoryId?: string; // Required for INCOME, EXPENSE. Null for TRANSFER.

  @IsOptional()
  @IsUUID('4', { message: 'El ID del ministerio no es un UUID válido' })
  ministryId?: string;

  @IsOptional()
  @IsString({ message: 'El motivo debe ser una cadena de texto' })
  reason?: string;
}
