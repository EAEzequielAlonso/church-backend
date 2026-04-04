import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { MentorshipTaskStatus } from '../enums/mentorship.enum';

export class GetTasksDto {
  @IsOptional()
  meetingId?: string;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsEnum(MentorshipTaskStatus)
  status?: MentorshipTaskStatus;

  @IsOptional()
  page?: number;
}
