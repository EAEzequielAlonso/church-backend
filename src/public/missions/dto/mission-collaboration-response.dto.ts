import { MissionCollaboration } from '../entities/mission-collaboration.entity';
import { ChurchSummaryDto } from '../../../common/dto/church-summary.dto';

export class MissionCollaborationResponseDto {
  id: string;
  missionProjectId: string;
  status: string;
  prayerSupport: boolean;
  financialSupport: boolean;
  volunteerSupport: boolean;
  materialSupport: boolean;
  logisticSupport: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;

  church?: ChurchSummaryDto | null;

  static fromEntity(entity: MissionCollaboration): MissionCollaborationResponseDto {
    const dto = new MissionCollaborationResponseDto();
    dto.id = entity.id;
    dto.missionProjectId = entity.missionProjectId;
    dto.status = entity.status;
    dto.prayerSupport = entity.prayerSupport;
    dto.financialSupport = entity.financialSupport;
    dto.volunteerSupport = entity.volunteerSupport;
    dto.materialSupport = entity.materialSupport;
    dto.logisticSupport = entity.logisticSupport;
    dto.notes = entity.notes;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;

    if (entity.church) {
      dto.church = {
        id: entity.church.id,
        name: entity.church.canonicalName || '',
        slug: entity.church.publicProfile?.slug || null,
        avatarUrl: entity.church.publicProfile?.logoUrl || null,
        city: entity.church.publicProfile?.city || null,
        state: entity.church.publicProfile?.state || null,
        country: entity.church.publicProfile?.country || null,
      };
    }

    return dto;
  }
}
