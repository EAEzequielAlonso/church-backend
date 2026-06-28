import { PersonSummaryDto } from '../../../../common/dto/person-summary.dto';
import { ChurchNeedSignal } from '../../entities/church-need-signal.entity';

export class ChurchNeedSignalResponseDto {
  id: string;
  observation: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  supportCount?: number;
  recentInformation?: any[];
  
  person?: PersonSummaryDto | null;
  location?: any | null; // NeedLocation isn't highly sensitive but can be included if needed

  static fromEntity(entity: ChurchNeedSignal, supportCount?: number, recentInformation?: any[]): ChurchNeedSignalResponseDto {
    const dto = new ChurchNeedSignalResponseDto();
    dto.id = entity.id;
    dto.observation = entity.observation;
    dto.status = entity.status;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    
    if (supportCount !== undefined) dto.supportCount = supportCount;
    if (recentInformation !== undefined) dto.recentInformation = recentInformation;

    if (entity.person) {
      dto.person = {
        id: entity.person.id,
        firstName: entity.person.firstName,
        lastName: entity.person.lastName,
        avatarUrl: entity.person.avatarUrl,
        slug: entity.person.slug,
      };
    }

    if (entity.needLocation) {
        dto.location = entity.needLocation;
    }

    return dto;
  }
}
