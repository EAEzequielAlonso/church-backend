import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SystemRole, FunctionalRole } from '../../common/enums';
import { AppPermission } from '../authorization/permissions.enum';
import { RolePermissions } from '../role-permissions';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredPermissions = this.reflector.getAllAndOverride<AppPermission[]>(PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredPermissions) {
            return true; // No permissions required
        }

        const { user } = context.switchToHttp().getRequest();

        if (!user) {
            return false;
        }

        // 1. Super Admin Bypass
        if (user.systemRole === SystemRole.ADMIN_APP) {
            return true;
        }

        // 2. Derive Permissions from Functional Roles
        // User roles in JWT are now FunctionalRoles
        const userFunctionalRoles = (user.roles || []) as FunctionalRole[];

        // Flatten all permissions from all roles
        const userPermissions = new Set<AppPermission>();

        userFunctionalRoles.forEach(role => {
            const rolePerms = RolePermissions[role];
            if (rolePerms) {
                rolePerms.forEach(p => userPermissions.add(p));
            }
        });

        // DEBUG: Permission Check
        console.log(`[PermissionsGuard] User: ${user.email} | Roles: ${JSON.stringify(userFunctionalRoles)}`);
        console.log(`[PermissionsGuard] Required: ${JSON.stringify(requiredPermissions)}`);
        // console.log(`[PermissionsGuard] Has: ${JSON.stringify(Array.from(userPermissions))}`);

        // 3. Check if user has ALL required permissions
        const hasPermission = requiredPermissions.every((permission) =>
            userPermissions.has(permission),
        );

        if (!hasPermission) {
            console.warn(`[PermissionsGuard] DENIED. Missing permissions.`);
            throw new ForbiddenException('Insufficient permissions');
        }

        return true;
    }
}
