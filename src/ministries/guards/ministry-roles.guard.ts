import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MinistryRole, SystemRole } from '../../common/enums';
import { MINISTRY_ROLES_KEY } from '../../auth/decorators/require-ministry-role.decorator';
import { GetUserRoleInMinistryUseCase } from '../use-cases/get-user-role-in-ministry.use-case';

@Injectable()
export class MinistryRolesGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private getUserRoleInMinistryUseCase: GetUserRoleInMinistryUseCase,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoles = this.reflector.getAllAndOverride<MinistryRole[]>(
            MINISTRY_ROLES_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const { user } = request;

        if (!user) {
            return false;
        }

        // Admins bypass
        if (user.systemRole === SystemRole.ADMIN_APP) {
            return true;
        }

        // Usually ID is in `id` or `ministryId`
        const ministryId = request.params.ministryId || request.params.id;

        if (!ministryId) {
            throw new ForbiddenException('Ministry ID missing from request parameters.');
        }

        // Query role in ministry
        const userRole = await this.getUserRoleInMinistryUseCase.execute(
            ministryId,
            user.personId,
            user.churchId, // ensure tenant match
        );

        if (!userRole) {
            throw new ForbiddenException('User is not a member of this ministry.');
        }

        const hasRole = requiredRoles.includes(userRole);

        if (!hasRole) {
            throw new ForbiddenException('Insufficient ministry role permissions.');
        }

        return true;
    }
}
