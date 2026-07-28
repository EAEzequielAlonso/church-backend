import { IsEnum, IsOptional } from 'class-validator';
import { FeedbackStatus, InternalPriority } from '../enums/feedback.enums';

export class UpdateFeedbackDto {
  @IsEnum(FeedbackStatus)
  @IsOptional()
  status?: FeedbackStatus;

  @IsEnum(InternalPriority)
  @IsOptional()
  internalPriority?: InternalPriority;
}
