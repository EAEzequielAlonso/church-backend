import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { Group } from './entities/group.entity';
import { GroupParticipant } from './entities/group-participant.entity';
import { GroupMeeting } from './entities/group-meeting.entity';
import { GroupAttendance } from './entities/group-attendance.entity';
import { StudyResource } from '../resources/entities/study-resource.entity';
import { AgendaModule } from '../agenda/agenda.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Group,
      GroupParticipant,
      GroupMeeting,
      GroupAttendance,
      StudyResource,
    ]),
    AgendaModule,
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
