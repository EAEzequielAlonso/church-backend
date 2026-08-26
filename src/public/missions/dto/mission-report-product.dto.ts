import { MissionReport } from '../entities/mission-report.entity';
import {
  MissionReportCategory,
  MissionReportAction,
} from '../enums/missions.enums';

export class MissionReportProductDto {
  id: string;
  missionProjectId: string;
  authorPersonId: string;
  category: MissionReportCategory;
  title: string;
  content: string;
  media: { id: string; url: string; order: number; observation?: string }[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Product-oriented fields
  authorName: string;
  authorAvatarUrl: string | null;

  // HATEOAS
  allowedActions: MissionReportAction[];

  static fromEntity(
    report: MissionReport,
    allowedActions: MissionReportAction[] = [],
  ): MissionReportProductDto {
    const dto = new MissionReportProductDto();
    dto.id = report.id;
    dto.missionProjectId = report.missionProjectId;
    dto.authorPersonId = report.authorPersonId;
    dto.category = report.category;
    dto.title = report.title;
    dto.content = report.content;
    dto.media =
      report.media?.map((m) => ({
        id: m.id,
        url: m.url,
        order: m.order,
        observation: m.observation,
      })) || [];
    dto.isPublic = report.isPublic;
    dto.createdAt = report.createdAt;
    dto.updatedAt = report.updatedAt;

    // Explicit relations mappings
    if (report.author) {
      dto.authorName =
        `${report.author.firstName} ${report.author.lastName}`.trim();
      dto.authorAvatarUrl = report.author.avatarUrl || null;
    } else {
      dto.authorName = 'Autor Desconocido';
      dto.authorAvatarUrl = null;
    }

    dto.allowedActions = allowedActions;

    return dto;
  }
}
