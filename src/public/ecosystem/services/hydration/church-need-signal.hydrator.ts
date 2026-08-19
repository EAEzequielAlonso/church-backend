import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { IEcosystemEntityHydrator } from './hydration.interface';
import { EcosystemActivity } from '../../entities/ecosystem-activity.entity';
import {
  EcosystemActivityEntityType,
} from '../../enums/ecosystem.enums';
import { ChurchNeedSignal } from '../../../need/entities/church-need-signal.entity';

@Injectable()
export class ChurchNeedSignalHydrator implements IEcosystemEntityHydrator {
  readonly entityType = EcosystemActivityEntityType.CHURCH_NEED_SIGNAL;

  constructor(
    @InjectRepository(ChurchNeedSignal)
    private readonly churchNeedSignalRepository: Repository<ChurchNeedSignal>,
  ) {}

  async hydrate(activities: EcosystemActivity[]): Promise<void> {
    if (!activities.length) return;

    // 1. Extract unique entity IDs
    const entityIds = [...new Set(activities.map((a) => a.entityId))];

    // 2. Fetch all related church need signals in a single batch query
    const signals = await this.churchNeedSignalRepository.find({
      where: { id: In(entityIds) },
      select: ['id', 'status', 'closeReason'], // Only fetch what we need for the live status
    });

    const signalMap = new Map(signals.map((s) => [s.id, s]));

    // 3. Attach the live entity status
    for (const activity of activities) {
      const liveSignal = signalMap.get(activity.entityId);
      
      // If the activity uses an old entityId (like info.id), liveSignal will be undefined.
      // We only inject the live status if we found the actual entity.
      if (liveSignal) {
        activity.liveEntityStatus = liveSignal.status;
        (activity as any).liveEntityCloseReason = liveSignal.closeReason;
      }
    }
  }
}
