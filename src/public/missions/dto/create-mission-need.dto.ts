import { IsEnum, IsString } from 'class-validator';
import { MissionNeedType } from '../enums/missions.enums';

export class CreateMissionNeedDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(MissionNeedType)
  type: MissionNeedType;
}
