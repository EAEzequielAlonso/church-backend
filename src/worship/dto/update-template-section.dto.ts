import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { SectionType } from '../enums/section-type.enum';

export class UpdateTemplateSectionDto {
  @ApiPropertyOptional({ description: 'Título de la sección' })
  @IsString({ message: 'El título debe ser una cadena de texto' })
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ enum: SectionType, description: 'Tipo de sección' })
  @IsEnum(SectionType, { message: 'El tipo de sección no es válido' })
  @IsOptional()
  type?: SectionType;

  @ApiPropertyOptional({ description: 'ID del ministerio responsable' })
  @IsUUID('4', { message: 'El ID del ministerio no es un UUID válido' })
  @IsOptional()
  ministryId?: string;

  @ApiPropertyOptional({ description: 'Duración estimada en minutos' })
  @IsInt({ message: 'La duración debe ser un número entero' })
  @Min(0, { message: 'La duración no puede ser menor a 0' })
  @IsOptional()
  defaultDuration?: number;

}
