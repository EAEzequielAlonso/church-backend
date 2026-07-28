import {
  IsOptional,
  IsNumber,
  Min,
  IsString,
  IsEnum,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  EcosystemActivityType,
  EcosystemActivityEntityType,
} from '../enums/ecosystem.enums';

export class GetEcosystemActivitiesDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  personId?: string;

  @IsOptional()
  @IsString()
  churchId?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(EcosystemActivityType, { each: true })
  activityTypes?: EcosystemActivityType[];

  @IsOptional()
  @IsArray()
  @IsEnum(EcosystemActivityEntityType, { each: true })
  entityTypes?: EcosystemActivityEntityType[];
}
