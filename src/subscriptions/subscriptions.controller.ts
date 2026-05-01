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
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { FunctionalRole } from '../common/enums';
import { CurrentChurch } from 'src/common/decorators';

@Controller('subscriptions')
export class SubscriptionsController {
  private readonly logger = new Logger(SubscriptionsController.name);

  constructor(private readonly subService: SubscriptionsService) {}

  @Get('plans')
  getPlans() {
    return this.subService.findAllPlans();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR)
  @Get('current')
  async getCurrentSubscription(@Request() req) {
    const churchId = req.user.churchId;
    if (!churchId)
      throw new BadRequestException('User not associated with a church');
    const sub = await this.subService.getCurrentSubscription(churchId);
    return sub || {};
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR)
  @Get('payments')
  async getPayments(@Request() req) {
    const churchId = req.user.churchId;
    if (!churchId)
      throw new BadRequestException('User not associated with a church');
    return this.subService.getPayments(churchId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR)
  @Get('usage')
  async getUsage(@Request() req) {
    const churchId = req.user.churchId;
    if (!churchId)
      throw new BadRequestException('User not associated with a church');
    return this.subService.getSubscriptionUsage(churchId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR)
  @Post(['subscribe', 'create-checkout'])
  async createSubscriptionLink(@Request() req, @Body('planId') planId: string) {
    // req.user from JWT strategy
    const churchId = req.user.churchId;
    const email = req.user.email;
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
