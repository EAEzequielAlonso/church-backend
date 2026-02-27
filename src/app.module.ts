import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { MembersModule } from './members/members.module';
import { GroupsModule } from './groups/groups.module';
import { FollowUpsModule } from './follow-ups/follow-ups.module';
import { TreasuryModule } from './treasury/treasury.module';
import { UsersModule } from './users/users.module';
import { ChurchesModule } from './churches/churches.module';
import { CounselingModule } from './counseling/counseling.module';
import { MinistriesModule } from './ministries/ministries.module';
import { SeedModule } from './seed/seed.module';
import { WorshipModule } from './worship/worship.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { AgendaModule } from './agenda/agenda.module';
import { FamiliesModule } from './families/families.module';
import { LibraryModule } from './library/library.module';
import { PrayersModule } from './prayers/prayers.module';
import { DiscipleshipModule } from './discipleships/discipleship.module';

import { InventoryModule } from './inventory/inventory.module';
import { DonationsModule } from './donations/donations.module';
import { BudgetModule } from './budget/budget.module';

import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => configService.get('database'),
      inject: [ConfigService],
    }),
    AuthModule,
    MembersModule,
    GroupsModule,
    FollowUpsModule,
    TreasuryModule,
    UsersModule,
    ChurchesModule,
    CounselingModule,
    MinistriesModule,
    SeedModule,
    DashboardModule,
    SubscriptionsModule,
    AgendaModule,
    FamiliesModule,
    LibraryModule,
    PrayersModule,
    DiscipleshipModule,

    InventoryModule,
    DonationsModule,
    WorshipModule,
    BudgetModule,
  ]
})
export class AppModule { }
