import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  IsUrl,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  SmallGroupStatus,
  GroupCapacityStatus,
} from '../enums/small-groups.enums';
import {
  MeetingFrequency,
  DayOfWeek,
} from '../../../shared/enums/meetings.enums';
import { GeoPrecision } from 'src/public/ecosystem/enums/ecosystem.enums';

export class CreateSmallGroupDto {
  @IsUUID()
  churchId: string;

  @IsUUID()
  leaderId: string;

  @IsOptional()
  @IsUUID()
  originMissionId?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(SmallGroupStatus)
  status?: SmallGroupStatus;

  @IsOptional()
  @IsEnum(GroupCapacityStatus)
  capacityStatus?: GroupCapacityStatus;

  @IsEnum(DayOfWeek)
  meetingDay: DayOfWeek;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'meetingTime must be in HH:MM format',
  })
  meetingTime: string;

  @IsEnum(MeetingFrequency)
  meetingFrequency: MeetingFrequency;

  // Contact
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsUrl()
  contactUrl?: string;

  @IsOptional()
  @IsString()
  contactWhatsapp?: string;

  // Geography
  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @IsOptional()
  @IsEnum(GeoPrecision)
  geoPrecision?: GeoPrecision;
}
