import { Injectable, CanActivate, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { EcclesiasticalRole, SystemRole } from '../../common/enums';
import { ChurchPerson } from '../../members/entities/church-person.entity';
import { getPermissionsForRoles } from '../authorization/role-permissions.config';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    // Check if user has at least one of the required roles
    if (user.systemRole === SystemRole.ADMIN_APP) return true; // Super Admin Bypass

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

    if (!user.roles || user.roles.length === 0) return false;

    return requiredRoles.some((role) => user.roles.includes(role));
  }
}
