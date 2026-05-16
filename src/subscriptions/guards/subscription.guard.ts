import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
} from '@nestjs/common';
import { SubscriptionsService } from '../subscriptions.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const securityContext = request.securityContext;
    const churchId = securityContext?.churchId;

    if (!churchId || churchId === 'ADMIN_APP') {
      return true;
    }

    const { status } =
      await this.subscriptionsService.getChurchSubscriptionStatus(churchId);

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
