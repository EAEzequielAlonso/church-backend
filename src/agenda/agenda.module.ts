import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';
import { ChurchPerson } from '../members/entities/church-person.entity';
import { Person } from '../users/entities/person.entity';
import { CalendarEvent } from './entities/calendar-event.entity';

import { MinistryRoleAssignment } from '../ministries/entities/ministry-role-assignment.entity';
import { Ministry } from '../ministries/entities/ministry.entity';
import { Group } from '../groups/entities/group.entity';
import { GroupParticipant } from '../groups/entities/group-participant.entity';

import { AgendaSyncService } from './agenda-sync.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChurchPerson,
      Person,
      CalendarEvent,
      Ministry,
      Group,
      GroupParticipant,
      MinistryRoleAssignment,
    ]),
  ],
  controllers: [AgendaController],
  providers: [AgendaService, AgendaSyncService],
  exports: [AgendaService, AgendaSyncService],
})
export class AgendaModule {}
