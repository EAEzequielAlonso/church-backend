import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SystemRole } from '../../../common/enums';
import { AppPermission } from '../authorization/permissions.enum';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<AppPermission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const { user, securityContext } = request;

    if (!user || !securityContext) return false;
    if (!requiredPermissions || requiredPermissions.length === 0) return true;
    if (securityContext.systemRole === SystemRole.ADMIN_APP) return true;

    const userPermissions = new Set<AppPermission>(securityContext.permissions ?? []);
    const hasPermission = requiredPermissions.every((permission) =>
      userPermissions.has(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
