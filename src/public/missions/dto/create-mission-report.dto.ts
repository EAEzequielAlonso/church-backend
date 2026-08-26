import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MissionReportCategory } from '../enums/missions.enums';
import { MediaItemDto } from './media-item.dto';

export class CreateMissionReportDto {
  @IsEnum(MissionReportCategory)
  category: MissionReportCategory;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaItemDto)
  @IsOptional()
  media?: MediaItemDto[];

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
