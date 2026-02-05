import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { MembersModule } from './members/members.module';
import { SmallGroupsModule } from './small-groups/small-groups.module';
import { FollowUpsModule } from './follow-ups/follow-ups.module';
import { TreasuryModule } from './treasury/treasury.module';
import { UsersModule } from './users/users.module';
import { ChurchesModule } from './churches/churches.module';
import { CounselingModule } from './counseling/counseling.module';
// import { PreachingModule } from './preaching/preaching.module';
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
import { CoursesModule } from './courses/courses.module';
import { InventoryModule } from './inventory/inventory.module';
import { DonationsModule } from './donations/donations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    
    TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => {

  const dbConfig = {
    type: 'postgres' as const,
    host: configService.get<string>('DB_HOST'),
    port: Number(configService.get<string>('DB_PORT')), // 👈 FIX
    username: configService.get<string>('DB_USERNAME'),
    password: configService.get<string>('DB_PASSWORD'),
    database: configService.get<string>('DB_DATABASE'),
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    synchronize: true,
    dropSchema: true,
    autoLoadEntities: true,
  };

  console.log('DB CONFIG =>', dbConfig);

  return dbConfig;
},
  inject: [ConfigService],
}),
    AuthModule,
    MembersModule,
    SmallGroupsModule,
    FollowUpsModule,
    TreasuryModule,
    UsersModule,
    ChurchesModule,
    CounselingModule,
    // PreachingModule, // Removed
    MinistriesModule,
    SeedModule,
    DashboardModule,
    SubscriptionsModule,
    AgendaModule,
    FamiliesModule,
    LibraryModule,
    PrayersModule,
    DiscipleshipModule,
    CoursesModule,
    InventoryModule,
    DonationsModule,
    WorshipModule,
  ]
})
export class AppModule { }
