import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EcosystemActivity } from './entities/ecosystem-activity.entity';
import { Church } from '../../core/churches/entities/church.entity';
import { EcosystemActivitiesService } from './services/ecosystem-activities.service';
import { EcosystemActivitiesController } from './ecosystem-activities.controller';
import { ChurchHydrator } from './services/hydration/church.hydrator';
import { EcosystemHydrationRegistry } from './services/hydration/ecosystem-hydration.registry';

@Module({
  imports: [TypeOrmModule.forFeature([EcosystemActivity, Church])],
  controllers: [EcosystemActivitiesController],
  providers: [
    ChurchHydrator,
    EcosystemHydrationRegistry,
    EcosystemActivitiesService,
  ],
  exports: [EcosystemActivitiesService],
})
export class EcosystemActivitiesModule {}
