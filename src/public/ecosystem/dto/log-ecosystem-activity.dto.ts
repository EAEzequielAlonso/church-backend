import { EcosystemActivityType, EcosystemActivityEntityType } from '../enums/ecosystem.enums';

export class LogEcosystemActivityDto {
  actorPersonId: string;
  actorChurchId?: string;
  relatedChurchId?: string;
  activityType: EcosystemActivityType;
  entityId: string;
  entityType: EcosystemActivityEntityType;
  country?: string;
  state?: string;
  city?: string;
  metadata?: Record<string, any>;
}
