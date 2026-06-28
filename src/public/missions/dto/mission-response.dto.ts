import { PersonSummaryDto } from '../../../common/dto/person-summary.dto';
import { ChurchSummaryDto } from '../../../common/dto/church-summary.dto';
import { MissionProject } from '../entities/mission-project.entity';

export class MissionProjectResponseDto {
  id: string;
  title: string;
  description: string;
  status: string;
  country: string;
  state: string;
  city: string;
  completedAt: Date | null;
  outcomeType: string | null;
  createdAt: Date;
  updatedAt: Date;
  
  leader?: PersonSummaryDto | null;
  creatorChurch?: ChurchSummaryDto | null;

  static fromEntity(entity: MissionProject): MissionProjectResponseDto {
    const dto = new MissionProjectResponseDto();
    dto.id = entity.id;
    dto.title = entity.title;
    dto.description = entity.description;
    dto.status = entity.status;
    dto.country = entity.country;
    dto.state = entity.state;
    dto.city = entity.city;
    dto.completedAt = entity.completedAt;
    dto.outcomeType = entity.outcomeType;
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

    // Include other necessary fields if needed (like needs, collaborations) 
    // but the instruction specifically asked to remove full Person/Church.

    return dto;
  }
}
