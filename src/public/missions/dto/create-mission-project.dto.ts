import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { GeoPrecision } from 'src/public/ecosystem/enums/ecosystem.enums';
import { MissionSourceType, MissionProjectStatus } from '../enums/missions.enums';
import { DayOfWeek, MeetingFrequency, MeetingModality } from '../../../shared/enums/meetings.enums';

export class CreateMissionProjectDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  vision?: string;

  // Ubicación
  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsNumber()
  @IsLatitude()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsLongitude()
  @IsOptional()
  longitude?: number;

  @IsEnum(GeoPrecision)
  @IsOptional()
  geoPrecision?: GeoPrecision;

  // Propiedad
  @IsUUID()
  creatorChurchId: string;

  @IsUUID()
  leaderId: string;

  // Origen
  @IsEnum(MissionSourceType)
  @IsOptional()
  sourceEntityType?: MissionSourceType;

  @IsUUID()
  @IsOptional()
  sourceEntityId?: string;

  // Fechas
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  plannedStartDate?: Date;

  @IsEnum(MissionProjectStatus)
  @IsOptional()
  status?: MissionProjectStatus;

  // Reuniones (Opcionales)
  @IsEnum(DayOfWeek)
  @IsOptional()
  meetingDay?: DayOfWeek;

  @IsEnum(MeetingFrequency)
  @IsOptional()
  meetingFrequency?: MeetingFrequency;

  @IsString()
  @IsOptional()
  meetingTime?: string;

  @IsString()
  @IsOptional()
  meetingTimezone?: string;

  @IsEnum(MeetingModality)
  @IsOptional()
  meetingModality?: MeetingModality;

  @IsString()
  @IsOptional()
  meetingAddress?: string;
}
