import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { DonationsService } from './donations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { SubscriptionGuard } from '../subscriptions/guards/subscription.guard';
@Controller('donations')
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @Post('preference')
  async createPreference(@Request() req, @Body() body: { amount: number }) {
    const userId = req.user.id;
    const churchId = req.user.churchId;
    const amount = body.amount;

    if (!amount || amount <= 0) throw new BadRequestException('Monto inválido');

    return this.donationsService.createPreference(
      amount,
      userId,
      churchId,
      req.user.email,
    );
  }
  @Post('webhook')
  async handleWebhook(
    @Query('id') id: string,
    @Query('topic') topic: string,
    @Body() body: any,
  ) {
    // MP sends id and topic in query params often, or in body?
    // documentation says: ?topic=payment&id=123456789
    // Also checks body.type / body.data.id
    const finalId = id || (body.data && body.data.id);
    const finalTopic = topic || body.type;

    if (finalId && finalTopic) {
      // Return 200 OK immediately to MP to avoid retries, process async
      this.donationsService.handleWebhook(finalId, finalTopic);
    }
    return { status: 'OK' };
  }
}
