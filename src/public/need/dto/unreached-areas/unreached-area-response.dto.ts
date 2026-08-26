import { PersonSummaryDto } from '../../../../common/dto/person-summary.dto';
import { UnreachedAreaAction } from '../../enums/need-signals.enum';

export class UnreachedAreaResponseDto {
  id: string;
  title: string;
  description: string;
  status: string;
  population?: number | null;
  language?: string | null;
  ethnicity?: string | null;
  religion?: string | null;
  missionaryNotes?: string | null;
  bibleAvailable: boolean;
  churchKnown: boolean;
  hostileEnvironment: boolean;
  governmentRestrictions: boolean;
  difficultAccess: boolean;
  createdAt: Date;
  updatedAt: Date;

  recentInformation?: any[];

  reporterPerson?: PersonSummaryDto | null;
  needLocation?: any | null;
  allowedActions: UnreachedAreaAction[];

  static fromEntity(
    entity: any,
    allowedActions: UnreachedAreaAction[] = [],
    recentInformation?: any[],
  ): UnreachedAreaResponseDto {
    const dto = new UnreachedAreaResponseDto();
    dto.id = entity.id;
    dto.title = entity.title;
    dto.description = entity.description;
    dto.status = entity.status;
    dto.population = entity.population ?? null;
    dto.language = entity.language ?? null;
    dto.ethnicity = entity.ethnicity ?? null;
    dto.religion = entity.religion ?? null;
    dto.missionaryNotes = entity.missionaryNotes ?? null;
    dto.bibleAvailable = entity.bibleAvailable;
    dto.churchKnown = entity.churchKnown;
    dto.hostileEnvironment = entity.hostileEnvironment;
    dto.governmentRestrictions = entity.governmentRestrictions;
    dto.difficultAccess = entity.difficultAccess;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    dto.allowedActions = allowedActions;

    if (recentInformation !== undefined)
      dto.recentInformation = recentInformation;

    if (entity.reporterPerson) {
      dto.reporterPerson = {
        id: entity.reporterPerson.id,
        firstName: entity.reporterPerson.firstName,
        lastName: entity.reporterPerson.lastName,
        avatarUrl: entity.reporterPerson.avatarUrl,
        slug: entity.reporterPerson.slug,
      };
    }

    if (entity.needLocation) {
      dto.needLocation = entity.needLocation;
    }

    return dto;
  }
}
