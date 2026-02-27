import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CounselingController } from './counseling.controller';
import { CounselingService } from './counseling.service';
import { CareProcess } from './entities/care-process.entity';
import { CareParticipant } from './entities/care-participant.entity';
import { CareNote } from './entities/care-note.entity';
import { CareSession } from './entities/care-session.entity';
import { CareTask } from './entities/care-task.entity';
import { ChurchPerson as Member } from '../members/entities/church-person.entity';
import { Church } from '../churches/entities/church.entity';
import { MembersService } from 'src/members/members.service';
import { Person } from 'src/users/entities/person.entity';
import { User } from 'src/users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CareProcess,
      CareParticipant,
      CareNote,
      CareSession,
      CareTask,
      Member,
      Church,
      Person,
      User,
    ])
  ],
  controllers: [CounselingController],
  providers: [CounselingService, MembersService],
  exports: [CounselingService]
})
export class CounselingModule { }
