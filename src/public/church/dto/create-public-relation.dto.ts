import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PublicChurchRelationType } from '../../enums/public.enums';

export class CreatePublicRelationDto {
  @IsOptional() @IsUUID() churchId?: string;
  @IsEnum(PublicChurchRelationType) relationType: PublicChurchRelationType;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
