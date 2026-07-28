import { ChurchSummaryDto } from '../../../../common/dto/church-summary.dto';
import { ChurchClaim } from '../../entities/church_claim.entity';

export class ChurchClaimResponseDto {
  id: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;

  church?: ChurchSummaryDto | null;

  static fromEntity(entity: ChurchClaim): ChurchClaimResponseDto {
    const dto = new ChurchClaimResponseDto();
    dto.id = entity.id;
    dto.status = entity.status;
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
