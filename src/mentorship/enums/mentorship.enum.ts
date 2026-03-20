export enum MentorshipType {
  DISCIPLESHIP = 'DISCIPLESHIP',
  COUNSELING = 'COUNSELING',
  FOLLOW_UP = 'FOLLOW_UP',
}

export enum MentorshipMode {
  FORMAL = 'FORMAL',
  INFORMAL = 'INFORMAL',
}

export enum MentorshipStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CLOSED = 'CLOSED',
}

export enum MentorshipRole {
  MENTOR = 'MENTOR',
  PARTICIPANT = 'PARTICIPANT',
}

export enum ParticipantStatus {
  PENDING = 'PENDING',
  AUTO_ACCEPTED = 'AUTO_ACCEPTED',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}

export enum MentorshipTaskStatus {
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  REVIEWED = 'REVIEWED',
}

export enum MentorshipNoteType {
  INTERNAL = 'INTERNAL',
  SHARED = 'SHARED',
  SUPERVISION = 'SUPERVISION',
}
