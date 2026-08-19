import { MissionNeed } from '../entities/mission-need.entity';
import {
  MissionNeedStatus,
  MissionNeedType,
  MissionNeedAction,
} from '../enums/missions.enums';

export class MissionNeedProductDto {
  id: string;
  missionProjectId: string;
  type: MissionNeedType;
  title: string;
  description: string;
  status: MissionNeedStatus;
  fulfilledByChurchId?: string;
  fulfilledByPersonId?: string;
  fulfilledAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Product-oriented fields
  fulfilledByChurchName?: string;
  fulfilledByChurchLogoUrl?: string | null;
  fulfilledByPersonName?: string;
  fulfilledByPersonAvatarUrl?: string | null;

  // HATEOAS
  allowedActions: MissionNeedAction[];

  static fromEntity(
    need: MissionNeed,
    allowedActions: MissionNeedAction[] = [],
  ): MissionNeedProductDto {
    const dto = new MissionNeedProductDto();
    dto.id = need.id;
    dto.missionProjectId = need.missionProjectId;
    dto.type = need.type;
    dto.title = need.title;
    dto.description = need.description;
    dto.status = need.status;
    dto.fulfilledByChurchId = need.fulfilledByChurchId;
    dto.fulfilledByPersonId = need.fulfilledByPersonId;
    dto.fulfilledAt = need.fulfilledAt;
    dto.createdAt = need.createdAt;
    dto.updatedAt = need.updatedAt;

    // Explicit relations mappings
    if (need.fulfilledByChurch) {
      dto.fulfilledByChurchName = need.fulfilledByChurch.canonicalName;
      dto.fulfilledByChurchLogoUrl =
        need.fulfilledByChurch.publicProfile?.logoUrl || null;
    }

    if (need.fulfilledByPerson) {
      dto.fulfilledByPersonName =
        `${need.fulfilledByPerson.firstName} ${need.fulfilledByPerson.lastName}`.trim();
      dto.fulfilledByPersonAvatarUrl = need.fulfilledByPerson.avatarUrl || null;
    }

    dto.allowedActions = allowedActions;

    return dto;
  }
}
