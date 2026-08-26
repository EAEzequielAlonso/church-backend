import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { IEcosystemEntityHydrator } from './hydration.interface';
import { EcosystemActivity } from '../../entities/ecosystem-activity.entity';
import { EcosystemActivityEntityType } from '../../enums/ecosystem.enums';
import { UnreachedArea } from '../../../need/entities/unreached-area.entity';

@Injectable()
export class UnreachedAreaHydrator implements IEcosystemEntityHydrator {
  readonly entityType = EcosystemActivityEntityType.UNREACHED_AREA;

  constructor(
    @InjectRepository(UnreachedArea)
    private readonly unreachedAreaRepository: Repository<UnreachedArea>,
  ) {}

  async hydrate(activities: EcosystemActivity[]): Promise<void> {
    if (!activities.length) return;

    // 1. Extract unique entity IDs
    const entityIds = [...new Set(activities.map((a) => a.entityId))];

    // 2. Fetch all related unreached areas in a single batch query
    const areas = await this.unreachedAreaRepository.find({
      where: { id: In(entityIds) },
      select: ['id', 'status', 'title'],
    });

    const areaMap = new Map(areas.map((a) => [a.id, a]));

    // 3. Attach the live entity status and enrich metadata
    for (const activity of activities) {
      const liveArea = areaMap.get(activity.entityId);

      if (liveArea) {
        activity.liveEntityStatus = liveArea.status;

        // Enrich metadata with title for the frontend Feed cards
        if (!activity.metadata) {
          activity.metadata = {};
        }
        if (!activity.metadata.areaTitle) {
          activity.metadata.areaTitle = liveArea.title;
        }
        if (!activity.metadata.title) {
          activity.metadata.title = liveArea.title;
        }
      }
    }
  }
}
