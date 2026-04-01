import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Put,
  Query,
  Delete,
} from '@nestjs/common';
import { PrayersService } from './prayers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AppPermission } from '../auth/authorization/permissions.enum';
import { CurrentChurch, CurrentUser } from '../common/decorators';
import { PrayerRequestVisibility } from '../common/enums';

import { SubscriptionGuard } from '../subscriptions/guards/subscription.guard';
@Controller('prayers')
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionGuard)
export class PrayersController {
  constructor(private readonly prayersService: PrayersService) {}

  @Get()
  // No specific permission required to TRY to view, but service filters.
  // However, usually we need at least some base permission or just being authenticated.
  // Let's assume PRAYER_VIEW_ALL is for "Seeing EVERYTHING" (leaders),
  // but regular users can see Public ones. So maybe just auth is enough?
  // Let's enforce a basic check or just let service handle it.
  // For now, let's require at least valid login.
  findAll(
    @CurrentChurch() churchId: string,
    @CurrentUser() user: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
  ) {
    return this.prayersService.findAll(
      churchId,
      user.memberId,
      user.roles,
      page,
      limit,
      status,
    );
  }

  @Post()
  @RequirePermissions(AppPermission.PRAYER_CREATE)
  create(
    @CurrentChurch() churchId: string,
    @CurrentUser() user: any,
    @Body()
    body: {
      motive: string;
      visibility: PrayerRequestVisibility;
      isAnonymous?: boolean;
    },
  ) {
    return this.prayersService.create(
      churchId,
      user.memberId,
      body.motive,
      body.visibility,
      body.isAnonymous,
    );
  }

  @Put(':id')
  update(
    @CurrentChurch() churchId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { motive: string },
  ) {
    return this.prayersService.update(id, churchId, user.memberId, body.motive);
  }

  @Put(':id/answer')
  markAnswered(
    @CurrentChurch() churchId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { testimony?: string },
  ) {
    return this.prayersService.markAnswered(id, churchId, user.memberId, body.testimony);
  }

  @Post(':id/updates')
  addUpdate(
    @CurrentChurch() churchId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { content: string },
  ) {
    return this.prayersService.addUpdate(id, churchId, user.memberId, body.content);
  }

  // --- MODERATION ---

  @Put(':id/status')
  @RequirePermissions(AppPermission.PRAYER_VIEW_ALL) // Assume Moderation permission
  setStatus(@CurrentChurch() churchId: string, @Param('id') id: string, @Body() body: { status: any }) {
    return this.prayersService.setStatus(id, churchId, body.status);
  }
  @Put(':id/hidden')
  @RequirePermissions(AppPermission.PRAYER_VIEW_ALL) // Assume Moderation permission
  toggleHidden(@CurrentChurch() churchId: string, @Param('id') id: string, @Body() body: { isHidden: boolean }) {
    return this.prayersService.toggleHidden(id, churchId, body.isHidden);
  }

  @Delete(':id')
  delete(@CurrentChurch() churchId: string, @Param('id') id: string, @CurrentUser() user: any) {
    return this.prayersService.delete(id, churchId, user.memberId, user.roles);
  }
}
