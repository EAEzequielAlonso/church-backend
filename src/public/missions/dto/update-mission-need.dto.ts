import { PartialType } from '@nestjs/mapped-types';
import { CreateMissionNeedDto } from './create-mission-need.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { MissionNeedStatus } from '../enums/missions.enums';

export class UpdateMissionNeedDto extends PartialType(CreateMissionNeedDto) {
  @IsEnum(MissionNeedStatus)
  @IsOptional()
  status?: MissionNeedStatus;
}
