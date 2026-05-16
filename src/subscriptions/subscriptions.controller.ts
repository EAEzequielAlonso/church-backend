import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  Query,
  Logger,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SecurityContextGuard } from '../auth/guards/security-context.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AppPermission } from '../auth/authorization/permissions.enum';
import { CurrentChurch, CurrentUser } from '../common/decorators';
import { SecurityContext } from '../auth/security-context.interface';

@Controller('subscriptions')
export class SubscriptionsController {
  private readonly logger = new Logger(SubscriptionsController.name);

  constructor(private readonly subService: SubscriptionsService) {}

  @Get('plans')
  getPlans() {
    return this.subService.findAllPlans();
  }

  @UseGuards(JwtAuthGuard, SecurityContextGuard, PermissionsGuard)
  @RequirePermissions(AppPermission.CHURCH_VIEW)
  @Get('current')
  async getCurrentSubscription(@CurrentChurch() churchId: string) {
    if (!churchId)
      throw new BadRequestException('User not associated with a church');
    const sub = await this.subService.getCurrentSubscription(churchId);
    return sub || {};
  }

  @UseGuards(JwtAuthGuard, SecurityContextGuard, PermissionsGuard)
  @RequirePermissions(AppPermission.CHURCH_VIEW)
  @Get('payments')
  async getPayments(@CurrentChurch() churchId: string) {
    if (!churchId)
      throw new BadRequestException('User not associated with a church');
    return this.subService.getPayments(churchId);
  }

  @UseGuards(JwtAuthGuard, SecurityContextGuard, PermissionsGuard)
  @RequirePermissions(AppPermission.CHURCH_VIEW)
  @Get('usage')
  async getUsage(@CurrentChurch() churchId: string) {
    if (!churchId)
      throw new BadRequestException('User not associated with a church');
    return this.subService.getSubscriptionUsage(churchId);
  }

  @UseGuards(JwtAuthGuard, SecurityContextGuard, PermissionsGuard)
  @RequirePermissions(AppPermission.CHURCH_VIEW)
  @Post(['subscribe', 'create-checkout'])
  async createSubscriptionLink(
    @CurrentChurch() churchId: string,
    @CurrentUser() securityContext: SecurityContext,
    @Body('planId') planId: string,
  ) {
    const email = securityContext.email;
    if (!churchId)
      throw new BadRequestException(
        'User needs to be associated with a church',
      );

    return this.subService.createSubscriptionLink(churchId, planId, email);
  }


  @Get('validate-payment')
  async validatePayment(@Query('payment_id') paymentId: string) {
    if (!paymentId) throw new BadRequestException('payment_id is required');
    return this.subService.validatePayment(paymentId);
  }

  @Post('webhook')
  async handleWebhook(@Body() body: any) {
    this.logger.debug(`Webhook received: ${JSON.stringify(body)}`);
    try {
      return await this.subService.handleWebhook(body);
    } catch (error) {
      this.logger.error('Error handling webhook', error);
      return { status: 'error', message: error.message };
    }
  }
}
