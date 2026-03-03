import { Module } from '@nestjs/common';
import { MinistriesController } from './ministries.controller';
import { MinistriesScheduleController } from './ministries-schedule.controller';
import { MinistriesService } from './ministries.service';
import { Ministry } from './entities/ministry.entity';
import { MinistryMember } from './entities/ministry-member.entity';
import { ChurchPerson } from '../members/entities/church-person.entity';
import { MinistryTask } from './entities/ministry-task.entity';
import { MeetingNote } from './entities/meeting-note.entity';
import { CalendarEvent } from '../agenda/entities/calendar-event.entity';

import { TypeOrmModule } from '@nestjs/typeorm';

import { ServiceDuty } from './entities/service-duty.entity';
import { MinistryRoleAssignment } from './entities/ministry-role-assignment.entity';

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
    ]),
  ],
  controllers: [MinistriesController, MinistriesScheduleController],
  providers: [MinistriesService],
})
export class MinistriesModule {}
