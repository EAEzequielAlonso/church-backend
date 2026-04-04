import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MinistriesController } from './ministries.controller';
import { MinistriesScheduleController } from './ministries-schedule.controller';

// Entities
import { Ministry } from './entities/ministry.entity';
import { MinistryMember } from './entities/ministry-member.entity';
import { ChurchPerson } from '../members/entities/church-person.entity';
import { MinistryTask } from './entities/ministry-task.entity';
import { MeetingNote } from './entities/meeting-note.entity';
import { CalendarEvent } from '../agenda/entities/calendar-event.entity';
import { ServiceDuty } from './entities/service-duty.entity';
import { MinistryRoleAssignment } from './entities/ministry-role-assignment.entity';

// Policies
import { MinistryPolicy } from './policies/ministry.policy';

// Use Cases
import { CreateMinistryUseCase } from './use-cases/create-ministry.use-case';
import { GetMinistriesUseCase } from './use-cases/get-ministries.use-case';
import { GetMinistryUseCase } from './use-cases/get-ministry.use-case';
import { UpdateMinistryUseCase } from './use-cases/update-ministry.use-case';
import { DeleteMinistryUseCase } from './use-cases/delete-ministry.use-case';
import { AddMinistryMemberUseCase } from './use-cases/add-ministry-member.use-case';
import { UpdateMinistryMemberRoleUseCase } from './use-cases/update-ministry-member-role.use-case';
import { DeleteMinistryMemberUseCase } from './use-cases/delete-ministry-member.use-case';
import { GetMinistryTasksUseCase } from './use-cases/get-ministry-tasks.use-case';
import { CreateMinistryTaskUseCase } from './use-cases/create-ministry-task.use-case';
import { UpdateMinistryTaskUseCase } from './use-cases/update-ministry-task.use-case';
import { DeleteMinistryTaskUseCase } from './use-cases/delete-ministry-task.use-case';
import { GetMinistryEventsUseCase } from './use-cases/get-ministry-events.use-case';
import { CreateMinistryEventUseCase } from './use-cases/create-ministry-event.use-case';
import { UpdateMinistryEventUseCase } from './use-cases/update-ministry-event.use-case';
import { DeleteMinistryEventUseCase } from './use-cases/delete-ministry-event.use-case';
import { GetMeetingNoteUseCase } from './use-cases/get-meeting-note.use-case';
import { CreateOrUpdateMeetingNoteUseCase } from './use-cases/create-or-update-meeting-note.use-case';
import { GetAllServiceDutiesUseCase } from './use-cases/get-all-service-duties.use-case';
import { GetServiceDutiesUseCase } from './use-cases/get-service-duties.use-case';
import { CreateServiceDutyUseCase } from './use-cases/create-service-duty.use-case';
import { DeleteServiceDutyUseCase } from './use-cases/delete-service-duty.use-case';
import { UpdateServiceDutyUseCase } from './use-cases/update-service-duty.use-case';
import { GetMinistryAssignmentsUseCase } from './use-cases/get-ministry-assignments.use-case';
import { CreateMinistryAssignmentsUseCase } from './use-cases/create-ministry-assignments.use-case';
import { DeleteMinistryAssignmentUseCase } from './use-cases/delete-ministry-assignment.use-case';
import { GetUserRoleInMinistryUseCase } from './use-cases/get-user-role-in-ministry.use-case';
import { MinistryMeeting } from './entities/ministry-meeting.entity';
import { AgendaModule } from '../agenda/agenda.module';

const useCases = [
  CreateMinistryUseCase,
  GetMinistriesUseCase,
  GetMinistryUseCase,
  UpdateMinistryUseCase,
  DeleteMinistryUseCase,
  AddMinistryMemberUseCase,
  UpdateMinistryMemberRoleUseCase,
  DeleteMinistryMemberUseCase,
  GetMinistryTasksUseCase,
  CreateMinistryTaskUseCase,
  UpdateMinistryTaskUseCase,
  DeleteMinistryTaskUseCase,
  GetMinistryEventsUseCase,
  CreateMinistryEventUseCase,
  UpdateMinistryEventUseCase,
  DeleteMinistryEventUseCase,
  GetMeetingNoteUseCase,
  CreateOrUpdateMeetingNoteUseCase,
  GetAllServiceDutiesUseCase,
  GetServiceDutiesUseCase,
  CreateServiceDutyUseCase,
  UpdateServiceDutyUseCase,
  DeleteServiceDutyUseCase,
  GetMinistryAssignmentsUseCase,
  CreateMinistryAssignmentsUseCase,
  DeleteMinistryAssignmentUseCase,
  GetUserRoleInMinistryUseCase,
];

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Ministry,
      MinistryMember,
      MinistryTask,
      MeetingNote,
      CalendarEvent,
      ChurchPerson,
      ServiceDuty,
      MinistryRoleAssignment,
      MinistryMeeting,
    ]),
    AgendaModule,
  ],
  controllers: [MinistriesController, MinistriesScheduleController],
  providers: [MinistryPolicy, ...useCases],
  exports: [GetUserRoleInMinistryUseCase],
})
export class MinistriesModule {}
