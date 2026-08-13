import { PersonSummaryDto } from '../../../common/dto/person-summary.dto';
import { ChurchSummaryDto } from '../../../common/dto/church-summary.dto';
import { MissionProject } from '../entities/mission-project.entity';
import { MissionNeedResponseDto } from './mission-need-response.dto';
import { MissionCollaborationResponseDto } from './mission-collaboration-response.dto';
import { MissionReportResponseDto } from './mission-report-response.dto';
import { GeoPrecision } from '../../ecosystem/enums/ecosystem.enums';
import { MissionSourceType, MissionOutcomeType, MissionProjectStatus } from '../enums/missions.enums';

export class MissionProjectResponseDto {
  id: string;
  title: string;
  summary: string | null;
  description: string;
  vision: string | null;
  
  // Ubicación
  country: string | null;
  state: string | null;
  city: string | null;
  address: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  geoPrecision: GeoPrecision;

  // Origen y Destino
  sourceEntityType: MissionSourceType;
  sourceEntityId: string | null;
  resultingChurchId: string | null;
  outcomeType: MissionOutcomeType | null;

  // Fechas y Estado
  plannedStartDate: Date | null;
  actualStartDate: Date | null;
  completedAt: Date | null;
  status: MissionProjectStatus;
  closureReason: string | null;

  // Reuniones
  meetingDay: string | null;
  meetingFrequency: string | null;
  meetingTime: string | null;
  meetingTimezone: string | null;
  meetingModality: string | null;
  meetingAddress: string | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Relaciones Principales
  leader?: PersonSummaryDto | null;
  creatorChurch?: ChurchSummaryDto | null;

  // Colecciones (Hijos)
  needs?: MissionNeedResponseDto[];
  collaborations?: MissionCollaborationResponseDto[];
  reports?: MissionReportResponseDto[];

  static fromEntity(entity: MissionProject): MissionProjectResponseDto {
    const dto = new MissionProjectResponseDto();
    
    // Core
    dto.id = entity.id;
    dto.title = entity.title;
    dto.summary = entity.summary ?? null;
    dto.description = entity.description;
    dto.vision = entity.vision ?? null;

    // Location
    dto.country = entity.country ?? null;
    dto.state = entity.state ?? null;
    dto.city = entity.city ?? null;
    dto.address = entity.address ?? null;
    dto.postalCode = entity.postalCode ?? null;
    dto.latitude = entity.latitude ?? null;
    dto.longitude = entity.longitude ?? null;
    dto.geoPrecision = entity.geoPrecision;

    // Origin/Destination
    dto.sourceEntityType = entity.sourceEntityType;
    dto.sourceEntityId = entity.sourceEntityId ?? null;
    dto.resultingChurchId = entity.resultingChurchId ?? null;
    dto.outcomeType = entity.outcomeType ?? null;

    // Dates and Status
    dto.plannedStartDate = entity.plannedStartDate ?? null;
    dto.actualStartDate = entity.actualStartDate ?? null;
    dto.completedAt = entity.completedAt ?? null;
    dto.status = entity.status;
    dto.closureReason = entity.closureReason ?? null;

    // Meetings
    dto.meetingDay = entity.meetingDay ?? null;
    dto.meetingFrequency = entity.meetingFrequency ?? null;
    dto.meetingTime = entity.meetingTime ?? null;
    dto.meetingTimezone = entity.meetingTimezone ?? null;
    dto.meetingModality = entity.meetingModality ?? null;
    dto.meetingAddress = entity.meetingAddress ?? null;

    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;

    if (entity.leader) {
      dto.leader = {
        id: entity.leader.id,
        firstName: entity.leader.firstName,
        lastName: entity.leader.lastName,
        avatarUrl: entity.leader.avatarUrl,
        slug: entity.leader.slug,
      };
    }

    if (entity.creatorChurch) {
      dto.creatorChurch = {
        id: entity.creatorChurch.id,
        name: entity.creatorChurch.canonicalName || '',
        slug: entity.creatorChurch.publicProfile?.slug || null,
        avatarUrl: entity.creatorChurch.publicProfile?.logoUrl || null,
        city: entity.creatorChurch.publicProfile?.city || null,
        state: entity.creatorChurch.publicProfile?.state || null,
        country: entity.creatorChurch.publicProfile?.country || null,
      };
    }

    if (entity.needs) {
      dto.needs = entity.needs.map(n => MissionNeedResponseDto.fromEntity(n));
    }

    if (entity.collaborations) {
      dto.collaborations = entity.collaborations.map(c => MissionCollaborationResponseDto.fromEntity(c));
    }

    if (entity.reports) {
      dto.reports = entity.reports.map(r => MissionReportResponseDto.fromEntity(r));
    }

    return dto;
  }
}
