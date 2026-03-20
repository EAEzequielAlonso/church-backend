import { PartialType } from '@nestjs/mapped-types';
import { CreateTransactionDto } from './create-transaction.dto';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {
  @IsOptional()
  @IsString({ message: 'El motivo debe ser una cadena de texto' })
  reason?: string; // Audit reason
}
