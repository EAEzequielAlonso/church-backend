import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { MissionOutcomeType } from '../enums/missions.enums';

export class CompleteMissionDto {
  @IsEnum(MissionOutcomeType)
  outcomeType: MissionOutcomeType;

  @IsUUID()
  @IsOptional()
  resultingChurchId?: string;
}
