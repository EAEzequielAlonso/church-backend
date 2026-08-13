import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/dtos/pagination-query.dto';
import { MissionNeedStatus } from '../enums/missions.enums';

export class MissionNeedQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(MissionNeedStatus)
  status?: MissionNeedStatus;
}
