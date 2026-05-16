import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ChurchPerson } from '../../members/entities/church-person.entity';
import { SystemRole, FunctionalRole } from '../../common/enums';
import {
  AuthenticatedRequestUser,
  SecurityContext,
} from '../security-context.interface';
import { getPermissionsForFunctionalRoles } from '../role-permissions';

@Injectable()
export class SecurityContextGuard implements CanActivate {
  constructor(private readonly dataSource: DataSource) {}

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

    const membership = await this.dataSource.getRepository(ChurchPerson).findOne({
      where: { personId: user.personId },
      order: { joinedAt: 'DESC' },
    });

    if (!membership) {
      throw new ForbiddenException('No church membership found');
    }

    const functionalRoles = (membership.functionalRoles ?? []) as FunctionalRole[];
    request.securityContext = {
      userId: user.userId,
      personId: user.personId,
      churchId: membership.churchId,
      churchPersonId: membership.id,
      systemRole: user.systemRole,
      functionalRoles,
      permissions: getPermissionsForFunctionalRoles(functionalRoles),
      membershipStatus: membership.membershipStatus,
      ecclesiasticalRole: membership.ecclesiasticalRole,
      email: user.email,
    } satisfies SecurityContext;


    return true;
  }
}
