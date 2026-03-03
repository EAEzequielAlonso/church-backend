import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { CalendarEventType } from '../../common/enums';

export class CreateCalendarEventDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsNotEmpty()
  @IsEnum(CalendarEventType)
  type: CalendarEventType;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  isAllDay?: boolean;

  @IsOptional()
  @IsUUID()
  ownerId?: string; // owner ID based on type (churchId, ministryId, groupId, etc)

  @IsOptional()
  @IsUUID('4', { each: true })
  attendeeIds?: string[]; // IDs of Persons to assign
}
