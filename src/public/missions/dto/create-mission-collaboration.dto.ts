import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateMissionCollaborationDto {
  @IsUUID()
  churchId: string;

  @IsBoolean()
  @IsOptional()
  prayerSupport?: boolean;

  @IsBoolean()
  @IsOptional()
  financialSupport?: boolean;

  @IsBoolean()
  @IsOptional()
  volunteerSupport?: boolean;

  @IsBoolean()
  @IsOptional()
  materialSupport?: boolean;

  @IsBoolean()
  @IsOptional()
  logisticSupport?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}
