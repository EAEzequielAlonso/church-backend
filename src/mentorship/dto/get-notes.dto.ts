import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { MentorshipNoteType } from '../enums/mentorship.enum';

export class GetNotesDto {
  @IsOptional()
  @IsUUID()
  meetingId?: string;

  @IsOptional()
  @IsEnum(MentorshipNoteType)
  type?: MentorshipNoteType;
}
