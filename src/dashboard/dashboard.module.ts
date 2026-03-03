import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChurchPerson } from '../members/entities/church-person.entity';
import { Group } from '../groups/entities/group.entity';
import { TreasuryTransaction } from '../treasury/entities/treasury-transaction.entity';
import { WorshipService } from '../worship/entities/worship-service.entity';
import { CalendarEvent } from '../agenda/entities/calendar-event.entity';
import { MentorshipProcess } from '../mentorship/infrastructure/entities/mentorship-process.entity';
import { MinistryMember } from '../ministries/entities/ministry-member.entity';
import { GroupParticipant } from '../groups/entities/group-participant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChurchPerson,
      Group,
      WorshipService,
      CalendarEvent,
      MentorshipProcess,
      MinistryMember,
      GroupParticipant,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
