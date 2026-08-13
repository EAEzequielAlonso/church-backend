import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateMissionProjectDto } from './create-mission-project.dto';

export class UpdateMissionProjectDto extends PartialType(
  OmitType(CreateMissionProjectDto, ['creatorChurchId', 'status'] as const),
) {}
