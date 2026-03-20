import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { TransactionType } from '../enums/treasury.enums';

export class CreateCategoryDto {
  @IsNotEmpty({ message: 'El nombre de la categoría es requerido' })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  name: string;

  @IsEnum(TransactionType, { message: 'El tipo de categoría no es válido' })
  @IsNotEmpty({ message: 'El tipo de categoría es requerido' })
  type: TransactionType; // INCOME or EXPENSE

  @IsOptional()
  @IsUUID('4', { message: 'El ID de la categoría padre no es un UUID válido' })
  parentCategoryId?: string;

  @IsOptional()
  @IsString({ message: 'El color debe ser una cadena de texto' })
  color?: string;

  @IsOptional()
  @IsString({ message: 'El icono debe ser una cadena de texto' })
  icon?: string;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  name?: string;

  @IsOptional()
  @IsUUID('4', { message: 'El ID de la categoría padre no es un UUID válido' })
  parentCategoryId?: string;

  @IsOptional()
  @IsString({ message: 'El color debe ser una cadena de texto' })
  color?: string;

  @IsOptional()
  @IsString({ message: 'El icono debe ser una cadena de texto' })
  icon?: string;

  @IsOptional()
  @IsBoolean({ message: 'El estado de archivado debe ser un valor booleano' })
  isArchived?: boolean;
}
