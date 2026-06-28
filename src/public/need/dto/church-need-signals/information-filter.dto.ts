import { IsEnum, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { NeedInformationCategory } from '../../enums/need-signals.enum';

export class InformationFilterDto {
  @IsEnum(NeedInformationCategory)
  @IsOptional()
  category?: NeedInformationCategory;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number = 10;
}
