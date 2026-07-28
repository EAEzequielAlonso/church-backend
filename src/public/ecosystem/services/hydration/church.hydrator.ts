import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { IEcosystemEntityHydrator } from './hydration.interface';
import { EcosystemActivity } from '../../entities/ecosystem-activity.entity';
import { EcosystemActivityEntityType } from '../../enums/ecosystem.enums';
import { Church } from '../../../../core/churches/entities/church.entity';

@Injectable()
export class ChurchHydrator implements IEcosystemEntityHydrator {
  readonly entityType = EcosystemActivityEntityType.CHURCH;

  constructor(
    @InjectRepository(Church)
    private readonly churchRepository: Repository<Church>,
  ) {}

  async hydrate(activities: EcosystemActivity[]): Promise<void> {
    if (!activities.length) return;

    // 1. Extract unique entity IDs
    const entityIds = [...new Set(activities.map((a) => a.entityId))];

    // 2. Fetch all related churches in a single batch query
    const churches = await this.churchRepository.find({
      where: { id: In(entityIds) },
    });

    // 3. Create a map for O(1) lookup
    const churchMap = new Map(churches.map((c) => [c.id, c]));

    // 4. Attach the live entity to the activity object
    // This allows the frontend to receive the hydrated entity seamlessly
    for (const activity of activities) {
      const liveChurch = churchMap.get(activity.entityId);
      if (liveChurch) {
        activity.relatedChurch = liveChurch;
      }
    }
  }
}
