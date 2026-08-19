import {
  PartialType,
  OmitType,
  IntersectionType,
  PickType,
} from '@nestjs/mapped-types';
import { CreateSmallGroupDto } from './create-small-group.dto';

export class UpdateSmallGroupDto extends IntersectionType(
  PartialType(
    OmitType(CreateSmallGroupDto, ['churchId', 'originMissionId'] as const),
  ),
  PickType(CreateSmallGroupDto, ['churchId'] as const),
) {}
