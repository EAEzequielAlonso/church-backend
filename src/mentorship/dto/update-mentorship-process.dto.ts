import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { MentorshipStatus } from '../enums/mentorship.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMentorshipProcessDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  motive?: string;

  @ApiPropertyOptional({ enum: MentorshipStatus })
  @IsOptional()
  @IsEnum(MentorshipStatus)
  status?: MentorshipStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  closeObservation?: string;
}
