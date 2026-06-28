import { NeedSignal } from '../entities/need-signal.entity';

export class NeedSignalResponseDto {
  id: string;
  note: string | null;
  impactedPeopleCount: number;
  contactEmail: string | null;
  contactPhone: string | null;
  contactUrl: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  
  location?: any | null;

  static fromEntity(entity: NeedSignal): NeedSignalResponseDto {
    const dto = new NeedSignalResponseDto();
    dto.id = entity.id;
    dto.note = entity.note;
    dto.impactedPeopleCount = entity.impactedPeopleCount;
    dto.contactEmail = entity.contactEmail;
    dto.contactPhone = entity.contactPhone;
    dto.contactUrl = entity.contactUrl;
    dto.status = entity.status;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;

    if (entity.needLocation) {
        dto.location = entity.needLocation;
    }

    return dto;
  }
}
