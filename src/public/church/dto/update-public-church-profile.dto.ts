import {
  IsArray,
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ChurchDenomination, DayOfWeek } from '../../enums/public.enums';
import { GeoPrecision } from '../../ecosystem/enums/ecosystem.enums';
import { UpdateDoctrinalIdentityDto } from './update-doctrinal-identity.dto';

export class UpdatePublicChurchMeetingDto {
  @IsEnum(DayOfWeek) dayOfWeek: DayOfWeek;
  @IsString() title: string;
  @IsString() startTime: string;
}

export class UpdatePublicChurchProfileDto {
  @IsOptional() @IsString() publicDescription?: string;
  @IsOptional() @IsArray() photoUrls?: string[];
  @IsOptional() @IsString() address?: string | null;
  @IsOptional() @IsString() city?: string | null;
  @IsOptional() @IsString() state?: string | null;
  @IsOptional() @IsString() country?: string | null;
  @IsOptional() @IsString() postalCode?: string | null;
  @IsOptional() @IsNumber() latitude?: number | null;
  @IsOptional() @IsNumber() longitude?: number | null;
  @IsOptional() @IsEnum(GeoPrecision) geoPrecision?: GeoPrecision | null;

  @IsOptional() @IsString() contactEmail?: string | null;
  @IsOptional() @IsString() contactPhone?: string | null;

  @IsOptional() @IsString() logoUrl?: string | null;
  @IsOptional() @IsString() coverUrl?: string | null;
  @IsOptional() @IsString() mainImageUrl?: string | null;

  // Social & Web Links
  @IsOptional() @IsString() website?: string | null;
  @IsOptional() @IsString() instagram?: string | null;
  @IsOptional() @IsString() facebook?: string | null;
  @IsOptional() @IsString() youtube?: string | null;

  @IsOptional()
  @IsEnum(ChurchDenomination)
  denomination?: ChurchDenomination | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePublicChurchMeetingDto)
  meetings?: UpdatePublicChurchMeetingDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateDoctrinalIdentityDto)
  doctrinalIdentity?: UpdateDoctrinalIdentityDto | null;
}
