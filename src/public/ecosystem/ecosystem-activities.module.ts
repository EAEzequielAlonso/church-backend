import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EcosystemActivity } from './entities/ecosystem-activity.entity';
import { EcosystemActivitiesService } from './services/ecosystem-activities.service';
import { EcosystemActivitiesController } from './ecosystem-activities.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EcosystemActivity])],
  controllers: [EcosystemActivitiesController],
  providers: [EcosystemActivitiesService],
  exports: [EcosystemActivitiesService],
})
export class EcosystemActivitiesModule { }
