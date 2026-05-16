import { EcclesiasticalRole, FunctionalRole, SystemRole } from '../common/enums';
import { AppPermission } from './authorization/permissions.enum';
import { MembershipStatus } from '../members/enums/membership-status.enum';

export interface SecurityContext {
  userId: string;
  systemRole: SystemRole;
  personId?: string | null;
  churchId?: string;
  churchPersonId?: string;
  functionalRoles?: FunctionalRole[];
  permissions?: AppPermission[];
  membershipStatus?: MembershipStatus;
  ecclesiasticalRole?: EcclesiasticalRole;
  email?: string;
}

export interface AuthenticatedRequestUser {
  userId: string;
  personId: string | null;
  email: string;
  systemRole: SystemRole;
  isEmailVerified?: boolean;
  provider?: string;
}
