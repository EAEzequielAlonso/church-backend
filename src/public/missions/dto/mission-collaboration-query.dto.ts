import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/dtos/pagination-query.dto';
import { MissionCollaborationStatus } from '../enums/missions.enums';

export class MissionCollaborationQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(MissionCollaborationStatus)
  status?: MissionCollaborationStatus;
}
