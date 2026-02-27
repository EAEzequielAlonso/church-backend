import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChurchPerson } from '../members/entities/church-person.entity';
import { Group } from '../groups/entities/group.entity';
import { TreasuryTransaction } from '../treasury/entities/treasury-transaction.entity';
import { FollowUp } from '../follow-ups/entities/follow-up.entity';
import { WorshipService } from '../worship/entities/worship-service.entity';
import { CalendarEvent } from '../agenda/entities/calendar-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChurchPerson,
      Group, // Replaced SmallGroup with Group
      TreasuryTransaction,
      FollowUp,
      WorshipService, // Imported
      CalendarEvent   // Imported
    ])
  ],
  controllers: [DashboardController],
  providers: [DashboardService]
})
export class DashboardModule { }
