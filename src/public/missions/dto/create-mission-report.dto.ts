import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { MissionReportCategory } from '../enums/missions.enums';

export class CreateMissionReportDto {
  @IsEnum(MissionReportCategory)
  category: MissionReportCategory;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
