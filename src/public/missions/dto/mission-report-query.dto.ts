import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/dtos/pagination-query.dto';
import { MissionReportCategory } from '../enums/missions.enums';

export class MissionReportQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(MissionReportCategory)
  category?: MissionReportCategory;
}
