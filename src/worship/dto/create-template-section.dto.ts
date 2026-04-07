import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { SectionType } from '../enums/section-type.enum';

export class CreateTemplateSectionDto {
  @ApiProperty({ description: 'Título de la sección', example: 'Alabanza' })
  @IsString({ message: 'El título debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  title: string;

  @ApiProperty({ enum: SectionType, description: 'Tipo de sección' })
  @IsEnum(SectionType, { message: 'El tipo de sección no es válido' })
  @IsNotEmpty({ message: 'El tipo de sección es obligatorio' })
  type: SectionType;

  @ApiProperty({ description: 'ID del ministerio responsable' })
  @IsUUID('4', { message: 'El ID del ministerio no es un UUID válido' })
  @IsNotEmpty({ message: 'El ministerio responsable es obligatorio' })
  ministryId: string;

  @ApiPropertyOptional({ description: 'Duración estimada en minutos', default: 15 })
  @IsInt({ message: 'La duración debe ser un número entero' })
  @Min(0, { message: 'La duración no puede ser menor a 0' })
  @IsOptional()
  defaultDuration?: number;

  @ApiPropertyOptional({ description: 'Orden de la sección', default: 0 })
  @IsInt({ message: 'El orden debe ser un número entero' })
  @Min(0, { message: 'El orden no puede ser menor a 0' })
  @IsOptional()
  order?: number;

}
