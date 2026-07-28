import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsNotEmpty,
} from 'class-validator';
import { NeedInformationCategory } from '../../enums/need-signals.enum';

export class AddNeedInformationDto {
  @IsEnum(NeedInformationCategory)
  category: NeedInformationCategory;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsArray()
  @IsOptional()
  attachments?: Record<string, unknown>[];
}
