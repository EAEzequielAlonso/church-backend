import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { SystemRole, FunctionalRole } from '../../../common/enums';
import {
  AuthenticatedRequestUser,
  SecurityContext,
} from '../security-context.interface';
import { getPermissionsForFunctionalRoles } from '../role-permissions';

@Injectable()
export class SecurityContextGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedRequestUser | undefined;
    if (!user) {
      return false;
    }

    if (user.systemRole === SystemRole.ADMIN_APP) {
      request.securityContext = {
        userId: user.userId,
        systemRole: SystemRole.ADMIN_APP,
        personId: user.personId ?? null,
        email: user.email,
      } satisfies SecurityContext;
      return true;
    }

    if (!user.personId) {
      throw new UnauthorizedException('Missing person context');
    }

    // Network-first active runtime:
    // We only provide identity and system role for now since ERP modules are frozen.
    request.securityContext = {
      userId: user.userId,
      personId: user.personId,
      systemRole: user.systemRole,
      email: user.email,
    } satisfies SecurityContext;

    return true;
  }
}
