import {
  MentorshipRole,
  MentorshipStatus,
} from '../enums/mentorship.enum';

export interface AddParticipantToProcessDto {
  processId: string;
  churchPersonId: string;
  role: MentorshipRole;
  hasUserAccount: boolean;
}

export interface ApproveParticipantDto {
  processId: string;
  churchPersonId: string;
}

export interface ChangeMentorshipStatusDto {
  processId: string;
  newStatus: MentorshipStatus;
  closeObservation?: string;
}
