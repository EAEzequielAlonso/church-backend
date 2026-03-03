import { BaseDomainEvent } from './base-domain-event';

export class MentorshipProcessCreatedEvent extends BaseDomainEvent {
  constructor(
    public readonly processId: string,
    public readonly churchId: string,
    public readonly mode: string,
    public readonly type: string,
  ) {
    super();
  }

  get eventName(): string {
    return MentorshipProcessCreatedEvent.name;
  }
}

export class MentorshipMeetingAddedEvent extends BaseDomainEvent {
  constructor(
    public readonly processId: string,
    public readonly meetingId: string,
    public readonly title?: string,
    public readonly description?: string,
    public readonly color?: string,
    public readonly scheduledDate?: Date,
    public readonly endDate?: Date,
    public readonly location?: string,
  ) {
    super();
  }

  get eventName(): string {
    return MentorshipMeetingAddedEvent.name;
  }
}

export class MentorshipNoteAddedEvent extends BaseDomainEvent {
  constructor(
    public readonly processId: string,
    public readonly noteId: string,
    public readonly authorChurchPersonId: string,
    public readonly noteType: string,
  ) {
    super();
  }

  get eventName(): string {
    return MentorshipNoteAddedEvent.name;
  }
}

export class MentorshipTaskAddedEvent extends BaseDomainEvent {
  constructor(
    public readonly processId: string,
    public readonly taskId: string,
    public readonly assignedChurchPersonId?: string,
  ) {
    super();
  }

  get eventName(): string {
    return MentorshipTaskAddedEvent.name;
  }
}

export class MentorshipStatusChangedEvent extends BaseDomainEvent {
  constructor(
    public readonly processId: string,
    public readonly oldStatus: string,
    public readonly newStatus: string,
  ) {
    super();
  }

  get eventName(): string {
    return MentorshipStatusChangedEvent.name;
  }
}
