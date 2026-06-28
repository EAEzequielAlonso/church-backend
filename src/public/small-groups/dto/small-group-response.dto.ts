import { PersonSummaryDto } from '../../../common/dto/person-summary.dto';
import { ChurchSummaryDto } from '../../../common/dto/church-summary.dto';
import { SmallGroup } from '../entities/small-group.entity';

export class SmallGroupResponseDto {
  id: string;
  name: string;
  description: string;
  status: string;
  country: string;
  state: string;
  city: string;
  createdAt: Date;
  updatedAt: Date;
  
  leader?: PersonSummaryDto | null;
  church?: ChurchSummaryDto | null;

  static fromEntity(entity: SmallGroup): SmallGroupResponseDto {
    const dto = new SmallGroupResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.description = entity.description;
    dto.status = entity.status;
    dto.country = entity.country;
    dto.state = entity.state;
    dto.city = entity.city;
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
