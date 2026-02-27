import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscipleshipController } from './discipleship.controller';
import { DiscipleshipService } from './discipleship.service';
import { Discipleship } from './entities/discipleship.entity';
import { DiscipleshipParticipant } from './entities/discipleship-participant.entity';
import { DiscipleshipMeeting } from './entities/discipleship-meeting.entity';
import { DiscipleshipNote } from './entities/discipleship-note.entity';
import { DiscipleshipTask } from './entities/discipleship-task.entity';
import { ChurchPerson as Member } from '../members/entities/church-person.entity';
import { Church } from '../churches/entities/church.entity';
import { Person } from '../users/entities/person.entity';
import { User } from '../users/entities/user.entity';
import { CalendarEvent } from '../agenda/entities/calendar-event.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Discipleship,
            DiscipleshipParticipant,
            DiscipleshipMeeting,
            DiscipleshipNote,
            DiscipleshipTask,
            Member,
            Church,
            Person,
            User,
            CalendarEvent
        ])
    ],
    controllers: [DiscipleshipController],
    providers: [DiscipleshipService],
    exports: [DiscipleshipService]
})
export class DiscipleshipModule { }
