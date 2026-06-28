import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateMissionCollaborationDto } from './create-mission-collaboration.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { MissionCollaborationStatus } from '../enums/missions.enums';

export class UpdateMissionCollaborationDto extends PartialType(
  OmitType(CreateMissionCollaborationDto, ['churchId'] as const)
) {
  @IsEnum(MissionCollaborationStatus)
  @IsOptional()
  status?: MissionCollaborationStatus;
}
