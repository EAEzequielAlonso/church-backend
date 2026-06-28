import { Type, Transform } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { GeoPrecision } from '../../../ecosystem/enums/ecosystem.enums';
import { ChurchDenomination, DayOfWeek } from '../../../enums/public.enums';
import { IsEnum } from 'class-validator';

export class CreatePublicChurchMeetingDto {
  @IsEnum(DayOfWeek)
  @IsNotEmpty()
  dayOfWeek: DayOfWeek;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  startTime: string;
}

export class CreatePublicChurchDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ChurchDenomination)
  @IsOptional()
  denomination?: ChurchDenomination;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsString()
  @IsOptional()
  publicDescription?: string;

  @IsEmail()
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  contactEmail?: string;

  @IsString()
  @IsOptional()
  contactPhone?: string;

  @IsUrl()
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  website?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  instagram?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  facebook?: string;

  @IsUrl()
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  logoUrl?: string;

  @IsUrl()
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  coverUrl?: string;

  @IsUrl()
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  mainImageUrl?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePublicChurchMeetingDto)
  @IsOptional()
  meetings?: CreatePublicChurchMeetingDto[];

  @IsString()
  @IsOptional()
  geoPrecision?: GeoPrecision;
}
