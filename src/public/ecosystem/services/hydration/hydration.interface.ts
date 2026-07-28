import { EcosystemActivity } from '../../entities/ecosystem-activity.entity';
import { EcosystemActivityEntityType } from '../../enums/ecosystem.enums';

export interface IEcosystemEntityHydrator {
  /**
   * The type of entity this hydrator is responsible for.
   */
  readonly entityType: EcosystemActivityEntityType;

  /**
   * Hydrates the given activities by fetching the related entities in a single batch query
   * and attaching them to the respective activities.
   *
   * @param activities The activities that need hydration (all of them must be of this entityType)
   */
  hydrate(activities: EcosystemActivity[]): Promise<void>;
}
