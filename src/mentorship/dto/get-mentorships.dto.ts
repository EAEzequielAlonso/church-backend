import { IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  MentorshipType,
  MentorshipStatus,
} from '../enums/mentorship.enum';

export class GetMentorshipsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(MentorshipType)
  type?: MentorshipType;

  @IsOptional()
  @IsEnum(MentorshipStatus)
  status?: MentorshipStatus;
}
