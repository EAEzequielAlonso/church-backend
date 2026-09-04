import { Type } from 'class-transformer';
import {
  IsBooleanString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ChurchDirectoryQueryDto {
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @Type(() => Number) latitude?: number;
  @IsOptional() @Type(() => Number) longitude?: number;
  @IsOptional() @IsBooleanString() verified?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() doctrinalTag?: string;
  @IsOptional() @IsString() sort?: 'relevance' | 'city' | 'newest_claimed';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000) limit = 12;
}
