import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Entidades (TypeORM Configuration)
import { MentorshipProcess } from './entities/mentorship-process.entity';
import { MentorshipProcessParticipant } from './entities/mentorship-process-participant.entity';
import { MentorshipMeeting } from './entities/mentorship-meeting.entity';
import { MentorshipNote } from './entities/mentorship-note.entity';
import { MentorshipTask } from './entities/mentorship-task.entity';
import { CalendarEvent } from '../agenda/entities/calendar-event.entity';
import { ChurchPerson } from '../members/entities/church-person.entity';
import { Person } from '../users/entities/person.entity';

// Controlador
import { MentorshipController } from './mentorship.controller';

// Servicios y Políticas
import { MentorshipService } from './services/mentorship.service';
import { MentorshipPolicy } from './policies/mentorship.policy';
import { MentorshipVisibilityPolicy } from './policies/mentorship.visibility-policy';

// Casos de Uso
import { CreateMentorshipProcessUseCase } from './use-cases/create-mentorship-process.use-case';
import { AddParticipantToProcessUseCase } from './use-cases/add-participant.use-case';
import { ApproveParticipantUseCase } from './use-cases/approve-participant.use-case';
import { ChangeMentorshipStatusUseCase } from './use-cases/change-status.use-case';
import { AddMeetingUseCase } from './use-cases/add-meeting.use-case';
import { UpdateMeetingUseCase } from './use-cases/update-meeting.use-case';
import { DeleteMeetingUseCase } from './use-cases/delete-meeting.use-case';
import { AddNoteUseCase } from './use-cases/add-note.use-case';
import { AddTaskUseCase } from './use-cases/add-task.use-case';
import { HardDeleteMentorshipProcessUseCase } from './use-cases/hard-delete-mentorship.use-case';
import { GetMentorshipsUseCase } from './use-cases/get-mentorships.use-case';
import { GetMentorshipByIdUseCase } from './use-cases/get-mentorship-by-id.use-case';
import { GetInvitationsUseCase } from './use-cases/get-invitations.use-case';
import { AcceptParticipationUseCase } from './use-cases/accept-participation.use-case';
import { DeclineParticipationUseCase } from './use-cases/decline-participation.use-case';
import { GetNotesUseCase } from './use-cases/get-notes.use-case';
import { GetTasksUseCase } from './use-cases/get-tasks.use-case';
import { UpdateNoteUseCase } from './use-cases/update-note.use-case';
import { DeleteNoteUseCase } from './use-cases/delete-note.use-case';
import { StartTaskUseCase } from './use-cases/start-task.use-case';
import { SubmitTaskUseCase } from './use-cases/submit-task.use-case';
import { ReviewTaskUseCase } from './use-cases/review-task.use-case';
import { UpdateTaskUseCase } from './use-cases/update-task.use-case';
import { DeleteTaskUseCase } from './use-cases/delete-task.use-case';
import { AgendaModule } from '../agenda/agenda.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MentorshipProcess,
      MentorshipProcessParticipant,
      MentorshipMeeting,
      MentorshipNote,
      MentorshipTask,
      CalendarEvent,
      ChurchPerson,
      Person,
    ]),
    EventEmitterModule.forRoot(),
    AgendaModule,
  ],
  controllers: [MentorshipController],
  providers: [
    MentorshipService,
    MentorshipPolicy,
    MentorshipVisibilityPolicy,
    CreateMentorshipProcessUseCase,
    AddParticipantToProcessUseCase,
    ApproveParticipantUseCase,
    ChangeMentorshipStatusUseCase,
    AddMeetingUseCase,
    UpdateMeetingUseCase,
    DeleteMeetingUseCase,
    AddNoteUseCase,
    AddTaskUseCase,
    HardDeleteMentorshipProcessUseCase,
    GetMentorshipsUseCase,
    GetMentorshipByIdUseCase,
    GetInvitationsUseCase,
    AcceptParticipationUseCase,
    DeclineParticipationUseCase,
    GetNotesUseCase,
    GetTasksUseCase,
    UpdateNoteUseCase,
    DeleteNoteUseCase,
    StartTaskUseCase,
    SubmitTaskUseCase,
    ReviewTaskUseCase,
    UpdateTaskUseCase,
    DeleteTaskUseCase,
  ],
  exports: [
    CreateMentorshipProcessUseCase,
    AddParticipantToProcessUseCase,
    ApproveParticipantUseCase,
    ChangeMentorshipStatusUseCase,
    AddMeetingUseCase,
    UpdateMeetingUseCase,
    DeleteMeetingUseCase,
    AddNoteUseCase,
    AddTaskUseCase,
    HardDeleteMentorshipProcessUseCase,
    GetMentorshipsUseCase,
    GetMentorshipByIdUseCase,
    GetInvitationsUseCase,
    AcceptParticipationUseCase,
    DeclineParticipationUseCase,
    GetNotesUseCase,
    GetTasksUseCase,
    UpdateNoteUseCase,
    DeleteNoteUseCase,
    StartTaskUseCase,
    SubmitTaskUseCase,
    ReviewTaskUseCase,
    UpdateTaskUseCase,
    DeleteTaskUseCase,
    MentorshipVisibilityPolicy,
  ],
})
export class MentorshipModule { }
