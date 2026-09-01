import {
  DoctrinalOpinion,
  DoctrinalOpinionValue,
} from 'src/public/church/entities/doctrinal-opinion.entity';

export class DoctrinalOpinionResponseDto {
  id: string;
  personId: string;
  churchId: string;
  opinion: DoctrinalOpinionValue;
  comment?: string;
  reviewedByAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Optional relations
  church?: {
    name: string;
    slug?: string;
    logoUrl?: string;
  };

  static fromEntity(entity: DoctrinalOpinion): DoctrinalOpinionResponseDto {
    const dto = new DoctrinalOpinionResponseDto();
    dto.id = entity.id;
    dto.personId = entity.personId;
    dto.churchId = entity.churchId;
    dto.opinion = entity.opinion;
    dto.comment = entity.comment;
    dto.reviewedByAdmin = entity.reviewedByAdmin;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    dto.updatedAt = entity.updatedAt;

    if (entity.church) {
      dto.church = {
        name: entity.church.canonicalName || 'Iglesia',
        slug: entity.church.publicProfile?.slug,
        logoUrl: entity.church.publicProfile?.logoUrl,
      };
    }

    return dto;
  }
}
