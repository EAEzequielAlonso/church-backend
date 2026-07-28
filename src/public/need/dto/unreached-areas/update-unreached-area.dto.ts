import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUnreachedAreaDto } from './create-unreached-area.dto';

export class UpdateUnreachedAreaDto extends PartialType(
  OmitType(CreateUnreachedAreaDto, ['country', 'state', 'city'] as const),
) {}
