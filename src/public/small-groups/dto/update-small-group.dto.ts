import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateSmallGroupDto } from './create-small-group.dto';

export class UpdateSmallGroupDto extends PartialType(
  OmitType(CreateSmallGroupDto, ['churchId', 'originMissionId'] as const),
) {}
