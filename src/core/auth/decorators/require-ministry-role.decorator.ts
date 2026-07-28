import { SetMetadata } from '@nestjs/common';
import { MinistryRole } from '../../../common/enums';

export const MINISTRY_ROLES_KEY = 'ministryRoles';
export const RequireMinistryRole = (...roles: MinistryRole[]) =>
  SetMetadata(MINISTRY_ROLES_KEY, roles);
