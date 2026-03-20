import { MentorshipNoteType } from '../enums/mentorship.enum';

export interface AddMeetingDto {
  processId: string;
  title?: string;
  description?: string;
  color?: string;
  scheduledDate?: Date;
  endDate?: Date;
  location?: string;
  type?: string;
}

export interface AddNoteDto {
  processId: string;
  authorChurchPersonId: string;
  meetingId?: string;
  title?: string;
  type: MentorshipNoteType;
  content: string;
}

export interface UpdateNoteDto {
  title?: string;
  content?: string;
  type?: MentorshipNoteType;
  meetingId?: string;
}

export interface AddTaskDto {
  processId: string;
  creatorChurchPersonId: string;
  assignedChurchPersonId?: string;
  isGroupTask: boolean;
  meetingId?: string;
  title: string;
  description?: string;
  mentorInstruction?: string;
  dueDate?: Date;
}
