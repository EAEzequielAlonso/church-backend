import {
  EcclesiasticalRole,
  FunctionalRole,
  SystemRole,
} from '../../common/enums';
import { AppPermission } from './authorization/permissions.enum';
import { MembershipStatus } from '../../common/enums';

export interface SecurityContext {
  userId: string;
  systemRole: SystemRole;
  personId?: string | null;
  /** @deprecated ERP-only. Not populated in Network-first runtime. */
  churchId?: string;
  /** @deprecated ERP-only. Not populated in Network-first runtime. */
  churchPersonId?: string;
  /** Resolved from ChurchWorkspace. Available when church has an active ERP workspace. */
  /** @deprecated ERP-only. Not populated in Network-first runtime. */
  workspaceId?: string;
  /** @deprecated ERP-only. Not populated in Network-first runtime. */
  functionalRoles?: FunctionalRole[];
  permissions?: AppPermission[];
  /** @deprecated ERP-only. Not populated in Network-first runtime. */
  membershipStatus?: MembershipStatus;
  /** @deprecated ERP-only. Not populated in Network-first runtime. */
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
