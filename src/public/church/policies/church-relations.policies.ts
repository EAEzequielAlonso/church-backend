import { BadRequestException } from '@nestjs/common';
import {
  EcclesialRole,
  PublicChurchRelationStatus,
  PublicChurchRelationType,
} from '../../enums/public.enums';

export class ChurchRelationsPolicy {
  /**
   * Validates the business rules for ecclesial hierarchy and relations.
   */
  static validateHierarchyRules(
    relationType: PublicChurchRelationType,
    ecclesialRole: EcclesialRole,
    isCurrentAdmin: boolean,
    status: PublicChurchRelationStatus,
  ) {
    // 1. Visitors cannot hold office or administer
    if (relationType === PublicChurchRelationType.REGULAR_VISITOR) {
      if (ecclesialRole !== EcclesialRole.NONE) {
        throw new BadRequestException(
          'Visitors cannot have an ecclesial role.',
        );
      }
      if (isCurrentAdmin) {
        throw new BadRequestException('Visitors cannot be administrators.');
      }
    }

    // 2. Admins must be APPROVED COMMUNITY_MEMBERs
    if (isCurrentAdmin) {
      if (relationType !== PublicChurchRelationType.COMMUNITY_MEMBER) {
        throw new BadRequestException(
          'Administrators must be community members.',
        );
      }
      if (status !== PublicChurchRelationStatus.APPROVED) {
        throw new BadRequestException(
          'Administrators must have an approved relation status.',
        );
      }
    }

    // 3. Ecclesial roles require APPROVED COMMUNITY_MEMBER status
    if (ecclesialRole !== EcclesialRole.NONE) {
      if (relationType !== PublicChurchRelationType.COMMUNITY_MEMBER) {
        throw new BadRequestException(
          'Ecclesial roles can only be assigned to community members.',
        );
      }
      if (status !== PublicChurchRelationStatus.APPROVED) {
        throw new BadRequestException(
          'Ecclesial roles require an approved relation status.',
        );
      }
    }
  }
}
