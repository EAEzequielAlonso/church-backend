import { IsString, IsOptional, IsEnum, IsNumber, IsUrl, IsEmail, Min, Max } from 'class-validator';
import { NeedSignalType } from 'src/public/enums/public.enums';

export class CreateOrUpdateNeedSignalDto {
  @IsEnum(NeedSignalType)
  @IsOptional()
  type?: NeedSignalType;

  @IsString()
  @IsOptional()
  note?: string;

  @IsNumber()
  @Min(1)
  @Max(50)
  @IsOptional()
  impactedPeopleCount?: number;

  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @IsString()
  @IsOptional()
  contactPhone?: string;

  @IsUrl()
  @IsOptional()
  contactUrl?: string;
}
