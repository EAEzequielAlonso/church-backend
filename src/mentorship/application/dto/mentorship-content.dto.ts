import { MentorshipNoteType } from '../../domain/enums/mentorship.enum';

export interface AddMeetingDto {
  processId: string;
  title?: string;
  description?: string;
  color?: string;
  scheduledDate?: Date;
  endDate?: Date;
  location?: string;
}

export interface AddNoteDto {
  processId: string;
  authorChurchPersonId: string;
  meetingId?: string;
  type: MentorshipNoteType;
  content: string;
}

export interface AddTaskDto {
  processId: string;
  creatorChurchPersonId: string;
  assignedChurchPersonId?: string;
  isGroupTask: boolean;
  meetingId?: string;
  title: string;
  description?: string;
  dueDate?: Date;
}
