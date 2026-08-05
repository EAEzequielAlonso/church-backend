import { MissionReport } from '../entities/mission-report.entity';
import { PersonSummaryDto } from '../../../common/dto/person-summary.dto';

export class MissionReportResponseDto {
  id: string;
  missionProjectId: string;
  category: string;
  title: string;
  content: string;
  attachments: string[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;

  author?: PersonSummaryDto | null;

  static fromEntity(entity: MissionReport): MissionReportResponseDto {
    const dto = new MissionReportResponseDto();
    dto.id = entity.id;
    dto.missionProjectId = entity.missionProjectId;
    dto.category = entity.category;
    dto.title = entity.title;
    dto.content = entity.content;
    dto.attachments = entity.attachments;
    dto.isPublic = entity.isPublic;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;

    if (entity.author) {
      dto.author = {
        id: entity.author.id,
        firstName: entity.author.firstName,
        lastName: entity.author.lastName,
        avatarUrl: entity.author.avatarUrl,
        slug: entity.author.slug,
      };
    }

    return dto;
  }
}
