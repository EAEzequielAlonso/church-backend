import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Entidades (TypeORM Configuration)
import { MentorshipProcess } from './infrastructure/entities/mentorship-process.entity';
import { MentorshipProcessParticipant } from './infrastructure/entities/mentorship-process-participant.entity';
import { MentorshipMeeting } from './infrastructure/entities/mentorship-meeting.entity';
import { MentorshipNote } from './infrastructure/entities/mentorship-note.entity';
import { MentorshipTask } from './infrastructure/entities/mentorship-task.entity';
import { CalendarEvent } from '../agenda/entities/calendar-event.entity';
import { ChurchPerson } from '../members/entities/church-person.entity';
import { Person } from '../users/entities/person.entity';

// Controlador
import { MentorshipController } from './presentation/mentorship.controller';

// Implementación Concreta de Repositorio a Inyectar
import { TypeOrmMentorshipProcessRepository } from './infrastructure/repositories/mentorship-process.repository';

// Adaptador de Infraestructura para el Bus de Eventos
import { NestEventBus } from './infrastructure/events/nest-event-bus';
import { MentorshipMeetingAddedHandler } from './infrastructure/events/handlers/mentorship-meeting-added.handler';

// Token de Inversión de Dependencias
import {
  MENTORSHIP_REPOSITORY_TOKEN,
  DOMAIN_EVENT_BUS_TOKEN,
} from './domain/constants/injection-tokens';

// Casos de Uso
import { CreateMentorshipProcessUseCase } from './application/use-cases/create-mentorship-process.use-case';
import { AddParticipantToProcessUseCase } from './application/use-cases/add-participant.use-case';
import { ApproveParticipantUseCase } from './application/use-cases/approve-participant.use-case';
import { ChangeMentorshipStatusUseCase } from './application/use-cases/change-status.use-case';
import { AddMeetingUseCase } from './application/use-cases/add-meeting.use-case';
import { AddNoteUseCase } from './application/use-cases/add-note.use-case';
import { AddTaskUseCase } from './application/use-cases/add-task.use-case';
import { HardDeleteMentorshipProcessUseCase } from './application/use-cases/hard-delete-mentorship.use-case';
import { GetMentorshipsUseCase } from './application/use-cases/get-mentorships.use-case';
import { GetMentorshipByIdUseCase } from './application/use-cases/get-mentorship-by-id.use-case';

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
  ],
  controllers: [MentorshipController],
  providers: [
    // 1. Dependency Inversion: Registramos el Token -> Clase Real
    {
      provide: MENTORSHIP_REPOSITORY_TOKEN,
      useClass: TypeOrmMentorshipProcessRepository,
    },
    // 2. Event Bus: Token -> Adaptador NestJS
    {
      provide: DOMAIN_EVENT_BUS_TOKEN,
      useClass: NestEventBus,
    },
    // 3. Handlers de Eventos
    MentorshipMeetingAddedHandler,
    // 4. Registramos los Casos de Uso
    CreateMentorshipProcessUseCase,
    AddParticipantToProcessUseCase,
    ApproveParticipantUseCase,
    ChangeMentorshipStatusUseCase,
    AddMeetingUseCase,
    AddNoteUseCase,
    AddTaskUseCase,
    HardDeleteMentorshipProcessUseCase,
    GetMentorshipsUseCase,
    GetMentorshipByIdUseCase,
  ],
  // Exportamos SOLO los Use Cases en caso de que otro módulo requiera mutar o leer procesos.
  // NUNCA exportamos TypeOrmMentorshipProcessRepository ni sus dependencias crudas.
  exports: [
    CreateMentorshipProcessUseCase,
    AddParticipantToProcessUseCase,
    ApproveParticipantUseCase,
    ChangeMentorshipStatusUseCase,
    AddMeetingUseCase,
    AddNoteUseCase,
    AddTaskUseCase,
    HardDeleteMentorshipProcessUseCase,
    GetMentorshipsUseCase,
    GetMentorshipByIdUseCase,
    // (Opcionalmente podemos exportar el TOKEN si otro módulo lo necesita para lectura,
    // pero por ahora mantenemos el dominio estrictamente cerrado).
  ],
})
export class MentorshipModule {}
