import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/dtos/pagination-query.dto';

export class MissionDirectoryQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;
}
