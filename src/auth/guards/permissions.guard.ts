import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { SystemRole, FunctionalRole } from '../../common/enums';
import { AppPermission } from '../authorization/permissions.enum';
import { RolePermissions } from '../role-permissions';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { ChurchPerson } from '../../members/entities/church-person.entity';
import { getPermissionsForRoles } from '../authorization/role-permissions.config';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<
      AppPermission[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    // 1. Super Admin Bypass (but still populate context if possible)
    if (user.systemRole === SystemRole.ADMIN_APP && !requiredPermissions) {
      return true;
    }

    // 2. Email Verification Check
    const handlerName = context.getHandler()?.name || '';
    const className = context.getClass()?.name || '';
    const isPublicRoute = handlerName.toLowerCase().includes('auth') || className.toLowerCase().includes('auth');

    if (!isPublicRoute && !user.isEmailVerified && user.provider === 'local') {
      this.logger.warn(`DENIED. User ${user.email} email not verified.`);
      throw new ForbiddenException('Email no verificado');
    }

    // DB Lookup: Find active ChurchPerson
    const churchPersonRepository = this.dataSource.getRepository(ChurchPerson);
    let membership: ChurchPerson | null = null;
    if (user.personId) {
      membership = await churchPersonRepository.findOne({
        where: { person: { id: user.personId } },
        relations: ['church'],
        order: { joinedAt: 'DESC' },
      });
    }

    // Mutate request.user for controllers (Phase 3 Requirement)
    if (membership) {
      user.churchId = membership.church?.id || membership.churchId;
      user.roles = membership.functionalRoles || [];
      user.membership = membership;
      user.memberId = membership.id;
      user.permissions = getPermissionsForRoles(user.roles);
    } else {
      user.churchId = null;
      user.roles = [];
      user.membership = null;
      user.memberId = null;
      user.permissions = [];
    }

    if (!requiredPermissions) {
      return true;
    }

    // 3. Church Association Check
    if (!user.churchId && requiredPermissions.length > 0) {
      this.logger.warn(`DENIED. User ${user.email} has no church context.`);
      throw new ForbiddenException('Debes pertenecer a una iglesia para realizar esta acción.');
    }

    // 4. Derive Permissions from Functional Roles
    const userFunctionalRoles = (user.roles || []) as FunctionalRole[];

    const userPermissions = new Set<AppPermission>();
    userFunctionalRoles.forEach((role) => {
      const rolePerms = RolePermissions[role];
      if (rolePerms) {
        rolePerms.forEach((p) => userPermissions.add(p));
      }
    });

    // 5. Check permissions
    const hasPermission = requiredPermissions.every((permission) =>
      userPermissions.has(permission),
    );

    if (!hasPermission) {
      this.logger.warn(`DENIED. Missing permissions for ${user.email}.`);
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
