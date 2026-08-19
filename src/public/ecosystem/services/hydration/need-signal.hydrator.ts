import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { IEcosystemEntityHydrator } from './hydration.interface';
import { EcosystemActivity } from '../../entities/ecosystem-activity.entity';
import {
  EcosystemActivityEntityType,
  EcosystemActivityType,
} from '../../enums/ecosystem.enums';
import { NeedSignal } from '../../../need/entities/need-signal.entity';

@Injectable()
export class NeedSignalHydrator implements IEcosystemEntityHydrator {
  readonly entityType = EcosystemActivityEntityType.NEED_SIGNAL;

  constructor(
    @InjectRepository(NeedSignal)
    private readonly needSignalRepository: Repository<NeedSignal>,
    @InjectRepository(EcosystemActivity)
    private readonly activityRepository: Repository<EcosystemActivity>,
  ) {}

  async hydrate(activities: EcosystemActivity[]): Promise<void> {
    if (!activities.length) return;

    // 1. Extract unique entity IDs
    const entityIds = [...new Set(activities.map((a) => a.entityId))];

    // 2. Fetch all related need signals in a single batch query
    const signals = await this.needSignalRepository.find({
      where: { id: In(entityIds) },
      select: ['id', 'status', 'closeReason'], // Only fetch what we need for the live status
    });

    const signalMap = new Map(signals.map((s) => [s.id, s]));

    // 3. Find the latest activity date for each entity to detect historical creations
    const latestActivities = await this.activityRepository
      .createQueryBuilder('act')
      .select('act.entityId', 'entityId')
      .addSelect('MAX(act.createdAt)', 'maxDate')
      .where('act.entityId IN (:...ids)', { ids: entityIds })
      .andWhere('act.activityType IN (:...types)', {
        types: [
          EcosystemActivityType.NEED_SIGNAL_CREATED,
          EcosystemActivityType.NEED_SIGNAL_RESOLVED,
          EcosystemActivityType.NEED_SIGNAL_DEACTIVATED,
        ],
      })
      .groupBy('act.entityId')
      .getRawMany();

    const maxDateMap = new Map<string, Date>();
    for (const row of latestActivities) {
      maxDateMap.set(row.entityId, new Date(row.maxDate));
    }

    // 4. Attach the live entity status and historical flag
    for (const activity of activities) {
      const liveSignal = signalMap.get(activity.entityId);
      if (liveSignal) {
        activity.liveEntityStatus = liveSignal.status;
        // Inject closeReason dynamically without breaking types
        (activity as any).liveEntityCloseReason = liveSignal.closeReason;
      }

      const maxDate = maxDateMap.get(activity.entityId);
      if (maxDate) {
        // Strict historical rule: if there is a newer signal event, this one is historical.
        // We use getTime() to safely compare Date objects.
        activity.isHistorical =
          activity.createdAt.getTime() < maxDate.getTime();
      } else {
        activity.isHistorical = false;
      }
    }
  }
}
