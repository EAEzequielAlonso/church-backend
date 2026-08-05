import { MissionNeed } from '../entities/mission-need.entity';

export class MissionNeedResponseDto {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  createdByPersonId: string;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: MissionNeed): MissionNeedResponseDto {
    const dto = new MissionNeedResponseDto();
    dto.id = entity.id;
    dto.title = entity.title;
    dto.description = entity.description;
    dto.type = entity.type;
    dto.status = entity.status;
    dto.createdByPersonId = entity.createdByPersonId;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
