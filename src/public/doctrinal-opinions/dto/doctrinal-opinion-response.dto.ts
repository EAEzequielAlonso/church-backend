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
    return dto;
  }
}
