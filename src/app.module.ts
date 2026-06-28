import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './core/auth/auth.module';
import { UsersModule } from './core/users/users.module';
import { ChurchesModule } from './core/churches/churches.module';
import { NotificationsModule } from './public/ecosystem/notifications/notifications.module';
import { AdminModule } from './core/admin-app/admin.module';
import { FeedbackModule } from './core/feedback/feedback.module';
import { PublicModule } from './public/public.module';

import configuration from './config/configuration';
import { MemoryMonitorService } from './common/memory-monitor.service';
import { runtimeFlags } from './common/runtime-flags';

import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ...(runtimeFlags.schedulesEnabled ? [ScheduleModule.forRoot()] : []),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        configService.get('database'),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    ChurchesModule,
    NotificationsModule,
    AdminModule,
    FeedbackModule,
    PublicModule,
  ],
  providers: [MemoryMonitorService],
})
export class AppModule { }
