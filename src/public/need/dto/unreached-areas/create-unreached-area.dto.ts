import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
} from 'class-validator';

export class CreateUnreachedAreaDto {
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
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsNumber()
  population?: number;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  ethnicity?: string;

  @IsOptional()
  @IsString()
  religion?: string;

  @IsOptional()
  @IsBoolean()
  bibleAvailable?: boolean;

  @IsOptional()
  @IsBoolean()
  churchKnown?: boolean;

  @IsOptional()
  @IsBoolean()
  hostileEnvironment?: boolean;

  @IsOptional()
  @IsBoolean()
  governmentRestrictions?: boolean;

  @IsOptional()
  @IsBoolean()
  difficultAccess?: boolean;

  @IsOptional()
  @IsString()
  missionaryNotes?: string;
}
