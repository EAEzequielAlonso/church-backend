import { IsArray, IsOptional, IsString, IsEnum, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ChurchDenomination, DayOfWeek } from '../../enums/public.enums';

export class UpdatePublicChurchMeetingDto {
  @IsEnum(DayOfWeek) dayOfWeek: DayOfWeek;
  @IsString() title: string;
  @IsString() startTime: string;
}

export class UpdatePublicChurchProfileDto {
  @IsOptional() @IsString() publicDescription?: string;
  @IsOptional() @IsArray() photoUrls?: string[];
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() country?: string;
  
  @IsOptional() @IsString() contactEmail?: string;
  @IsOptional() @IsString() contactPhone?: string;
  
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() coverUrl?: string;
  @IsOptional() @IsString() mainImageUrl?: string;

  // Social & Web Links
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsString() instagram?: string;
  @IsOptional() @IsString() facebook?: string;
  @IsOptional() @IsString() youtube?: string;

  @IsOptional() @IsEnum(ChurchDenomination) denomination?: ChurchDenomination;

  @IsOptional() 
  @IsArray() 
  @ValidateNested({ each: true })
  @Type(() => UpdatePublicChurchMeetingDto)
  meetings?: UpdatePublicChurchMeetingDto[];

  @IsOptional() 
  @IsObject() 
  doctrinalIdentity?: any;
}
