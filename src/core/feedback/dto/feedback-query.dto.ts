
import { IsEnum, IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { FeedbackType, FeedbackModule, FeedbackStatus } from '../enums/feedback.enums';

export class FeedbackQueryDto {
  @IsEnum(FeedbackStatus)
  @IsOptional()
  status?: FeedbackStatus;

  @IsEnum(FeedbackType)
  @IsOptional()
  type?: FeedbackType;

  @IsEnum(FeedbackModule)
  @IsOptional()
  module?: FeedbackModule;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;
}
