import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMinistryAssignmentDto {
  @IsUUID()
  @IsNotEmpty()
  roleId: string;

  @IsUUID()
  @IsNotEmpty()
  personId: string;

  @IsDateString()
  @IsNotEmpty()
  date: string; // YYYY-MM-DD

  @IsString()
  @IsOptional()
  serviceType?: string;
}

export class BulkCreateAssignmentsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMinistryAssignmentDto)
  assignments: CreateMinistryAssignmentDto[];
}
