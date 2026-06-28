import { SetMetadata } from '@nestjs/common';

export enum PublicRole {
  PUBLIC_USER = 'PUBLIC_USER',
  CLAIMED_CHURCH_ADMIN = 'CLAIMED_CHURCH_ADMIN',
  PLATFORM_PUBLIC_ADMIN = 'PLATFORM_PUBLIC_ADMIN',
}

export const PUBLIC_ROLE_KEY = 'public_role';
export const PublicRoles = (...roles: PublicRole[]) => SetMetadata(PUBLIC_ROLE_KEY, roles);

export function isClaimedChurchAdmin(role: PublicRole | null | undefined): boolean {
  return role === PublicRole.CLAIMED_CHURCH_ADMIN;
}

export function isPlatformPublicAdmin(role: PublicRole | null | undefined): boolean {
  return role === PublicRole.PLATFORM_PUBLIC_ADMIN;
}
