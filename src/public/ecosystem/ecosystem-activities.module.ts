import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EcosystemActivity } from './entities/ecosystem-activity.entity';
import { Church } from '../../core/churches/entities/church.entity';
import { NeedSignal } from '../need/entities/need-signal.entity';
import { ChurchNeedSignal } from '../need/entities/church-need-signal.entity';
import { EcosystemActivitiesService } from './services/ecosystem-activities.service';
import { EcosystemActivitiesController } from './ecosystem-activities.controller';
import { ChurchHydrator } from './services/hydration/church.hydrator';
import { NeedSignalHydrator } from './services/hydration/need-signal.hydrator';
import { ChurchNeedSignalHydrator } from './services/hydration/church-need-signal.hydrator';
import { EcosystemHydrationRegistry } from './services/hydration/ecosystem-hydration.registry';

@Module({
  imports: [TypeOrmModule.forFeature([EcosystemActivity, Church, NeedSignal, ChurchNeedSignal])],
  controllers: [EcosystemActivitiesController],
  providers: [
    ChurchHydrator,
    NeedSignalHydrator,
    ChurchNeedSignalHydrator,
    EcosystemHydrationRegistry,
    EcosystemActivitiesService,
  ],
  exports: [EcosystemActivitiesService],
})
export class EcosystemActivitiesModule {}
