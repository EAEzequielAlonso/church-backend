import { PersonSummaryDto } from '../../../../common/dto/person-summary.dto';
import { ChurchNeedSignal } from '../../entities/church-need-signal.entity';
import { ChurchNeedSignalAction } from '../../enums/need-signals.enum';

export class ChurchNeedSignalResponseDto {
  id: string;
  observation: string;
  status: string;
  closeReason?: string;
  createdAt: Date;
  updatedAt: Date;
  supportCount?: number;
  recentInformation?: any[];
  hasSupported?: boolean;
  hasThirdPartyInfo?: boolean;

  person?: PersonSummaryDto | null;
  location?: any | null; // NeedLocation isn't highly sensitive but can be included if needed
  allowedActions: ChurchNeedSignalAction[];

  static fromEntity(
    entity: ChurchNeedSignal | any, // using any to bypass strict type for hasSupported
    allowedActions: ChurchNeedSignalAction[] = [],
    supportCount?: number,
    recentInformation?: any[],
  ): ChurchNeedSignalResponseDto {
    const dto = new ChurchNeedSignalResponseDto();
    dto.id = entity.id;
    dto.observation = entity.observation;
    dto.status = entity.status;
    dto.closeReason = entity.closeReason;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    dto.allowedActions = allowedActions;

    if (entity.hasSupported !== undefined)
      dto.hasSupported = entity.hasSupported;
    if (entity.hasThirdPartyInfo !== undefined)
      dto.hasThirdPartyInfo = entity.hasThirdPartyInfo;

    if (supportCount !== undefined) dto.supportCount = supportCount;
    if (recentInformation !== undefined)
      dto.recentInformation = recentInformation;

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
