import { MissionCollaboration } from '../entities/mission-collaboration.entity';
import {
  MissionCollaborationStatus,
  MissionCollaborationAction,
} from '../enums/missions.enums';

export class MissionCollaborationProductDto {
  id: string;
  missionProjectId: string;
  churchId: string;
  status: MissionCollaborationStatus;
  prayerSupport: boolean;
  financialSupport: boolean;
  volunteerSupport: boolean;
  materialSupport: boolean;
  logisticSupport: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;

  // Product-oriented fields
  churchName: string;
  churchLogoUrl: string | null;
  churchLocation: string | null;
  // Mission Context (Added for "Mis Colaboraciones")
  missionProjectTitle?: string;

  // HATEOAS
  allowedActions: MissionCollaborationAction[];

  static fromEntity(
    collab: MissionCollaboration,
    allowedActions: MissionCollaborationAction[] = [],
  ): MissionCollaborationProductDto {
    const dto = new MissionCollaborationProductDto();
    dto.id = collab.id;
    dto.missionProjectId = collab.missionProjectId;
    dto.churchId = collab.churchId;
    dto.status = collab.status;
    dto.prayerSupport = collab.prayerSupport;
    dto.financialSupport = collab.financialSupport;
    dto.volunteerSupport = collab.volunteerSupport;
    dto.materialSupport = collab.materialSupport;
    dto.logisticSupport = collab.logisticSupport;
    dto.notes = collab.notes;
    dto.createdAt = collab.createdAt;
    dto.updatedAt = collab.updatedAt;

    // Explicit relations mappings (avoiding deep nested structures for the frontend)
    dto.churchName = collab.church?.canonicalName || 'Iglesia Desconocida';
    dto.churchLogoUrl = collab.church?.publicProfile?.logoUrl || null;

    let location = null;
    if (collab.church?.publicProfile) {
      const profile = collab.church.publicProfile;
      location = [profile.city, profile.country].filter(Boolean).join(', ');
    }
    dto.churchLocation = location || null;

    dto.missionProjectTitle = collab.missionProject?.title;

    dto.allowedActions = allowedActions;

    return dto;
  }
}
