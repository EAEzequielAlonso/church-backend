import { IsString, IsOptional, IsDateString, IsBoolean, IsEnum, IsUUID, IsArray } from 'class-validator';
import { CalendarEventType, EventSourceType } from '../../common/enums';
import { Person } from '../../users/entities/person.entity';

export class SyncProjectionDto {
    @IsString()
    title: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsDateString()
    startDate: string | Date;

    @IsDateString()
    endDate: string | Date;

    @IsOptional()
    @IsString()
    location?: string;

    @IsOptional()
    @IsBoolean()
    isAllDay?: boolean;

    @IsOptional()
    @IsString()
    color?: string;

    @IsEnum(EventSourceType)
    sourceType: EventSourceType;

    @IsUUID()
    sourceId: string;

    @IsOptional()
    @IsUUID()
    ownerId?: string;

    @IsEnum(CalendarEventType)
    type: CalendarEventType;

    @IsOptional()
    @IsArray()
    attendees?: Person[];
}
