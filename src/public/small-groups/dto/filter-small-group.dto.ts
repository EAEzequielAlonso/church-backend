import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DayOfWeek, SmallGroupStatus } from '../enums/small-groups.enums';

export class FilterSmallGroupDto {
  @IsOptional()
  @IsUUID()
  churchId?: string;

  @IsOptional()
  @IsString()
  q?: string; // Search query for name or description

  @IsOptional()
  @IsEnum(SmallGroupStatus)
  status?: SmallGroupStatus;

  @IsOptional()
  @IsEnum(DayOfWeek)
  meetingDay?: DayOfWeek;

  // Geography bounds for map filtering
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  neLat?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  neLng?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  swLat?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  swLng?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 50;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  offset?: number = 0;
}
