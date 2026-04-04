
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import {
  FeedbackType,
  FeedbackModule,
  FeedbackPriority,
} from '../enums/feedback.enums';

export class CreateFeedbackDto {
  @IsEnum(FeedbackType)
  @IsNotEmpty()
  type: FeedbackType;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  message: string;

  @IsEnum(FeedbackModule)
  @IsNotEmpty()
  module: FeedbackModule;

  @IsEnum(FeedbackPriority)
  @IsOptional()
  priority?: FeedbackPriority;

  @IsString()
  @IsNotEmpty()
  route: string;

  @IsString()
  @IsNotEmpty()
  userAgent: string;

  @IsString()
  @IsOptional()
  screen?: string;

  @IsString()
  @IsOptional()
  action?: string;
}
