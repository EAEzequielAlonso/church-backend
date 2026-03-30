import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { MembersModule } from './members/members.module';
import { GroupsModule } from './groups/groups.module';
import { TreasuryModule } from './treasury/treasury.module';
import { UsersModule } from './users/users.module';
import { ChurchesModule } from './churches/churches.module';
import { MinistriesModule } from './ministries/ministries.module';
import { SeedModule } from './seed/seed.module';
import { WorshipModule } from './worship/worship.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { AgendaModule } from './agenda/agenda.module';
import { FamiliesModule } from './families/families.module';
import { LibraryModule } from './library/library.module';
import { PrayersModule } from './prayers/prayers.module';

import { InventoryModule } from './inventory/inventory.module';
import { DonationsModule } from './donations/donations.module';
import { BudgetModule } from './budget/budget.module';
import { MentorshipModule } from './mentorship/mentorship.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ProfileModule } from './profile/profile.module';
import { AdminModule } from './admin/admin.module';

import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        configService.get('database'),
      inject: [ConfigService],
    }),
    AuthModule,
    MembersModule,
    GroupsModule,
    TreasuryModule,
    UsersModule,
    ChurchesModule,
    MinistriesModule,
    SeedModule,
    DashboardModule,
    SubscriptionsModule,
    AgendaModule,
    FamiliesModule,
    LibraryModule,
    PrayersModule,

    InventoryModule,
    DonationsModule,
    WorshipModule,
    BudgetModule,
    MentorshipModule,
    NotificationsModule,
    ProfileModule,
    AdminModule,
  ],
})
export class AppModule {}
