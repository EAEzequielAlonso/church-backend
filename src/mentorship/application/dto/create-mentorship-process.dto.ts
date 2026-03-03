import {
  MentorshipMode,
  MentorshipType,
} from '../../domain/enums/mentorship.enum';

export interface CreateMentorshipProcessDto {
  churchId: string;
  type: MentorshipType;
  mode: MentorshipMode;
  motive?: string;
  mentors: {
    churchPersonId: string;
    // true si el churchPersonId está asociado a un usuario real registrado (person.userId !== null)
    hasUserAccount: boolean;
  }[];
  participants: {
    churchPersonId: string;
    hasUserAccount: boolean;
  }[];
}
