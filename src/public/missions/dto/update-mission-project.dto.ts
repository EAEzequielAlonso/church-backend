import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateMissionProjectDto } from './create-mission-project.dto';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { MissionProjectStatus } from '../enums/missions.enums';

export class UpdateMissionProjectDto extends PartialType(
  OmitType(CreateMissionProjectDto, ['creatorChurchId'] as const)
) {
  @IsEnum(MissionProjectStatus)
  @IsOptional()
  status?: MissionProjectStatus;
}
