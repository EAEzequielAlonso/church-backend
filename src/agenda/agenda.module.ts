import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';
import { CareSession } from '../counseling/entities/care-session.entity';
import { CareTask } from '../counseling/entities/care-task.entity';
import { ChurchPerson } from '../members/entities/church-person.entity';

import { CareProcess } from '../counseling/entities/care-process.entity';
import { CareParticipant } from '../counseling/entities/care-participant.entity';
import { Person } from '../users/entities/person.entity';
import { CalendarEvent } from './entities/calendar-event.entity';

import { MinistryRoleAssignment } from '../ministries/entities/ministry-role-assignment.entity';
import { FollowUp } from '../follow-ups/entities/follow-up.entity';
import { Ministry } from '../ministries/entities/ministry.entity';
import { Group } from '../groups/entities/group.entity';
import { GroupParticipant } from '../groups/entities/group-participant.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            CareSession, CareTask, ChurchPerson, CareProcess, CareParticipant,
            Person, CalendarEvent, Ministry, Group, GroupParticipant,
            MinistryRoleAssignment, FollowUp
        ]),
    ],
    controllers: [AgendaController],
    providers: [AgendaService],
    exports: [AgendaService]
})
export class AgendaModule { }
