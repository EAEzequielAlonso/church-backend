import { Injectable, OnModuleInit } from '@nestjs/common';
import { IEcosystemEntityHydrator } from './hydration.interface';
import { ChurchHydrator } from './church.hydrator';
import { NeedSignalHydrator } from './need-signal.hydrator';
import { EcosystemActivityEntityType } from '../../enums/ecosystem.enums';
import { EcosystemActivity } from '../../entities/ecosystem-activity.entity';
import { ChurchNeedSignalHydrator } from './church-need-signal.hydrator';

@Injectable()
export class EcosystemHydrationRegistry implements OnModuleInit {
  private readonly hydrators = new Map<
    EcosystemActivityEntityType,
    IEcosystemEntityHydrator
  >();

  constructor(
    private readonly churchHydrator: ChurchHydrator,
    private readonly needSignalHydrator: NeedSignalHydrator,
    private readonly churchNeedSignalHydrator: ChurchNeedSignalHydrator,
    // Add future hydrators here (e.g. missionHydrator, etc.)
  ) {}

  onModuleInit() {
    this.register(this.churchHydrator);
    this.register(this.needSignalHydrator);
    this.register(this.churchNeedSignalHydrator);
    // Register future hydrators here
  }

  private register(hydrator: IEcosystemEntityHydrator) {
    this.hydrators.set(hydrator.entityType, hydrator);
  }

  /**
   * Performs batch hydration on the provided activities.
   * It groups activities by entityType and calls the corresponding hydrator for each group.
   */
  async hydrateActivities(activities: EcosystemActivity[]): Promise<void> {
    if (!activities || activities.length === 0) return;

    // 1. Group activities by entityType
    const groupedActivities = new Map<
      EcosystemActivityEntityType,
      EcosystemActivity[]
    >();

    for (const activity of activities) {
      if (!groupedActivities.has(activity.entityType)) {
        groupedActivities.set(activity.entityType, []);
      }
      groupedActivities.get(activity.entityType)!.push(activity);
    }

    // 2. Hydrate each group using its specific hydrator
    const hydrationPromises: Promise<void>[] = [];

    for (const [entityType, group] of groupedActivities.entries()) {
      const hydrator = this.hydrators.get(entityType);

      if (hydrator) {
        hydrationPromises.push(hydrator.hydrate(group));
      } else {
        // If no hydrator is registered for an entity type, the activity will just rely on its metadata snapshot
        // (Hybrid Event Sourcing pattern).
      }
    }

    await Promise.all(hydrationPromises);
  }
}
