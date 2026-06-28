import { IsString, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum ChurchNeedSignalSortBy {
  DATE_DESC = 'DATE_DESC',
  SUPPORTS_DESC = 'SUPPORTS_DESC'
}

export class ChurchNeedSignalFilterDto {
  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsEnum(ChurchNeedSignalSortBy)
  @IsOptional()
  sortBy?: ChurchNeedSignalSortBy = ChurchNeedSignalSortBy.DATE_DESC;

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
