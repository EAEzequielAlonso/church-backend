import {
  EcclesiasticalRole,
  MinistryRole,
  SystemRole,
  FunctionalRole,
} from '../../common/enums';
import { AppPermission } from './permissions.enum';

export const ROLE_PERMISSIONS: Record<string, AppPermission[]> = {
  // --- System Roles ---
  [SystemRole.ADMIN_APP]: Object.values(AppPermission), // Super Admin has all permissions

  // --- Ecclesiastical Roles ---
  [EcclesiasticalRole.PASTOR]: [
    AppPermission.CHURCH_MANAGE,
    AppPermission.CHURCH_VIEW,
    AppPermission.MEMBER_VIEW,
    AppPermission.MEMBER_CREATE,
    AppPermission.MEMBER_UPDATE,
    AppPermission.MEMBER_DELETE,
    AppPermission.MEMBER_EXPORT,
    AppPermission.COUNSELING_CREATE,
    AppPermission.COUNSELING_VIEW_ALL,
    AppPermission.COUNSELING_VIEW_SENSITIVE,
    AppPermission.COUNSELING_VIEW_SUPERVISION,
    AppPermission.COUNSELING_UPDATE,
    AppPermission.COUNSELING_DELETE,
    AppPermission.GROUP_CREATE,
    AppPermission.GROUP_UPDATE,
    AppPermission.GROUP_DELETE,
    AppPermission.GROUP_VIEW,
    AppPermission.GROUP_MANAGE_MEMBERS,
    AppPermission.FAMILY_CREATE,
    AppPermission.FAMILY_UPDATE,
    AppPermission.FAMILY_DELETE,
    AppPermission.FAMILY_VIEW,
    AppPermission.MINISTRY_VIEW,
    AppPermission.MINISTRY_MANAGE,
    AppPermission.MINISTRY_EVENT_MANAGE,
    AppPermission.LIBRARY_VIEW,
    AppPermission.LIBRARY_MANAGE_BOOKS,
    AppPermission.LIBRARY_MANAGE_LOANS,
    AppPermission.PRAYER_VIEW_ALL,
    AppPermission.PRAYER_CREATE,
    AppPermission.PRAYER_MANAGE,
    AppPermission.FINANCE_VIEW,
    AppPermission.FINANCE_MANAGE,
    AppPermission.FINANCE_AUDIT,
    AppPermission.ROLE_MANAGE,
    AppPermission.AGENDA_CREATE_CHURCH,
    AppPermission.AGENDA_CREATE_MINISTRY,
    AppPermission.RESOURCE_VIEW,
    AppPermission.RESOURCE_MANAGE,
  ],

  [EcclesiasticalRole.ELDER]: [
    AppPermission.CHURCH_VIEW,
    AppPermission.MEMBER_VIEW,
    AppPermission.MEMBER_CREATE,
    AppPermission.MEMBER_UPDATE,
    AppPermission.COUNSELING_CREATE,
    AppPermission.COUNSELING_VIEW_ALL,
    AppPermission.COUNSELING_UPDATE,
    AppPermission.GROUP_VIEW,
    AppPermission.FAMILY_VIEW,
    AppPermission.MINISTRY_VIEW,
    AppPermission.LIBRARY_VIEW,
    AppPermission.PRAYER_VIEW_ALL,
    AppPermission.PRAYER_CREATE,
    AppPermission.FINANCE_VIEW,
    AppPermission.RESOURCE_VIEW,
  ],

  [EcclesiasticalRole.DEACON]: [
    AppPermission.MEMBER_VIEW,
    AppPermission.GROUP_VIEW,
  ],

  // --- Ministry Roles ---
  // These are usually additive.
  // E.g. A member who is a Ministry LEADER might get extra permissions for that ministry context,
  // but globally we might grant them generic permissions here or handle context separately.
  [MinistryRole.LEADER]: [
    AppPermission.GROUP_CREATE,
    AppPermission.GROUP_MANAGE_MEMBERS,
    AppPermission.AGENDA_CREATE_MINISTRY,
  ],

  // --- Functional Roles ---
  [FunctionalRole.MEMBER]: [
    AppPermission.PRAYER_CREATE,
    AppPermission.PRAYER_VIEW_ALL,
    AppPermission.GROUP_VIEW,
    AppPermission.MINISTRY_VIEW,
    AppPermission.LIBRARY_VIEW, // Let members view catalog
    AppPermission.RESOURCE_VIEW,
  ],

  [FunctionalRole.AUDITOR]: [
    AppPermission.COUNSELING_VIEW_SUPERVISION,
    AppPermission.COUNSELING_VIEW_ALL,
    AppPermission.COUNSELING_CREATE,
    AppPermission.COUNSELING_UPDATE,
  ],

  [FunctionalRole.ADMIN_CHURCH]: [
    AppPermission.COUNSELING_VIEW_SUPERVISION,
    AppPermission.COUNSELING_VIEW_ALL,
    AppPermission.COUNSELING_CREATE,
    AppPermission.COUNSELING_UPDATE,
    AppPermission.CHURCH_MANAGE,
    AppPermission.MEMBER_VIEW,
    AppPermission.MEMBER_UPDATE,
  ],
};

/**
 * Helper to get permissions for a list of roles.
 * It merges all permissions from the provided roles.
 */
export function getPermissionsForRoles(roles: string[]): AppPermission[] {
  const permissions = new Set<AppPermission>();

  for (const role of roles) {
    const rolePerms = ROLE_PERMISSIONS[role];
    if (rolePerms) {
      rolePerms.forEach((p) => permissions.add(p));
    }
  }

  return Array.from(permissions);
}
