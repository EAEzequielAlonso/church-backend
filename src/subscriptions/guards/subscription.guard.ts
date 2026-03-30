import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SubscriptionsService } from '../subscriptions.service';
import { ChurchPerson } from '../../members/entities/church-person.entity';
import { getPermissionsForRoles } from '../../auth/authorization/role-permissions.config';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If churchId is not already on user (mutated by RolesGuard/PermissionsGuard), fetch it
    const churchPersonRepository = this.dataSource.getRepository(ChurchPerson);
    if (!user.churchId && user.personId) {
      const membership = await churchPersonRepository.findOne({
        where: { person: { id: user.personId } },
        order: { joinedAt: 'DESC' },
      });
      if (membership) {
        user.churchId = membership.churchId;
        user.memberId = membership.id;
        user.roles = membership.functionalRoles || [];
        user.permissions = getPermissionsForRoles(user.roles);
        user.membership = membership;
      }
    }

    if (!user || !user.churchId) {
      return true; 
    }

    const { status } = await this.subscriptionsService.getChurchSubscriptionStatus(user.churchId);

    if (status === 'EXPIRED') {
      throw new HttpException(
        'Tu suscripción ha expirado. Debes renovarla para continuar utilizando las funcionalidades principales.',
        402, // 402 Payment Required
      );
    }

    // Allow if ACTIVE, TRIAL, or PAYMENT_PENDING
    return true;
  }
}
