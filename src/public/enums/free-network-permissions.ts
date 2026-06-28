import { AppPermission } from '../../core/auth/authorization/permissions.enum';

export const FREE_NETWORK_ALLOWED_PERMISSIONS: AppPermission[] = [
  AppPermission.CHURCH_VIEW,
  AppPermission.CHURCH_MANAGE,
  AppPermission.MEMBER_VIEW,
  AppPermission.MEMBERSHIP_REQUEST_VIEW,
  AppPermission.MEMBERSHIP_REQUEST_MANAGE,
];

export const FREE_NETWORK_DENIED_PERMISSIONS: AppPermission[] = [
  AppPermission.FINANCE_VIEW,
  AppPermission.FINANCE_MANAGE,
  AppPermission.FINANCE_AUDIT,
  AppPermission.INVENTORY_VIEW,
  AppPermission.INVENTORY_MANAGE,
  AppPermission.RESOURCE_MANAGE,
  AppPermission.MINISTRY_MANAGE,
  AppPermission.MEMBER_EXPORT,
  AppPermission.WORSHIP_EXPORT,
];
