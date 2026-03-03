import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Adjust path if needed

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subService: SubscriptionsService) {}

  @Get('plans')
  getPlans() {
    return this.subService.findAllPlans();
  }

  @UseGuards(JwtAuthGuard)
  @Get('current')
  async getCurrentSubscription(@Request() req) {
    const churchId = req.user.churchId;
    if (!churchId)
      throw new BadRequestException('User not associated with a church');
    const sub = await this.subService.getCurrentSubscription(churchId);
    return sub || {};
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscribe')
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

  @Post('webhook')
  async handleWebhook(@Body() body: any) {
    console.log('Webhook received:', JSON.stringify(body));
    // return this.subService.handleWebhook(body);
    return { status: 'OK' };
  }
}
