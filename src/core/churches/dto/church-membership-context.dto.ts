import {
  EcclesiasticalRole,
  FunctionalRole,
  MembershipStatus,
  Permission,
} from '../../../common/enums';

export class ChurchMembershipContextDto {
  churchId: string;
  churchSlug: string;
  churchName: string;
  memberId: string | null;

  ecclesiasticalRole: EcclesiasticalRole;
  functionalRoles: FunctionalRole[];
  membershipStatus: MembershipStatus;
  permissions: Permission[];
}
