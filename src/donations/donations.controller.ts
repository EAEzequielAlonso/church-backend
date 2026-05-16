import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { DonationsService } from './donations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SecurityContextGuard } from '../auth/guards/security-context.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentChurch, CurrentUser } from '../common/decorators';
import { SecurityContext } from '../auth/security-context.interface';

import { SubscriptionGuard } from '../subscriptions/guards/subscription.guard';

@Controller('donations')
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  @UseGuards(JwtAuthGuard, SecurityContextGuard, PermissionsGuard, SubscriptionGuard)
  @Post('preference')
  async createPreference(
    @CurrentUser() securityContext: SecurityContext,
    @CurrentChurch() churchId: string,
    @Body() body: { amount: number },
  ) {
    const userId = securityContext.userId;
    const amount = body.amount;

    if (!amount || amount <= 0) throw new BadRequestException('Monto inválido');

    return this.donationsService.createPreference(
      amount,
      userId,
      churchId,
      // We don't have email in SecurityContext, but we might need it.
      // request.user still has it if we need it, but the goal is to use SecurityContext.
      // If needed, we could add email to SecurityContext.
      (securityContext as any).email || '', 
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
