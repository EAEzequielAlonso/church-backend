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
import { SecurityContextGuard } from '../auth/guards/security-context.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AppPermission } from '../auth/authorization/permissions.enum';
import { CurrentChurch, CurrentUser } from '../common/decorators';
import { PrayerRequestVisibility } from '../common/enums';
import { SecurityContext } from '../auth/security-context.interface';

import { SubscriptionGuard } from '../subscriptions/guards/subscription.guard';

@Controller('prayers')
@UseGuards(JwtAuthGuard, SecurityContextGuard, PermissionsGuard, SubscriptionGuard)
export class PrayersController {
  constructor(private readonly prayersService: PrayersService) {}

  @Get()
  findAll(
    @CurrentChurch() churchId: string,
    @CurrentUser() user: SecurityContext,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
  ) {
    return this.prayersService.findAll(
      churchId,
      user.churchPersonId,
      user.permissions || [],
      page,
      limit,
      status,
    );
  }

  @Post()
  @RequirePermissions(AppPermission.PRAYER_CREATE)
  create(
    @CurrentChurch() churchId: string,
    @CurrentUser() user: SecurityContext,
    @Body()
    body: {
      motive: string;
      visibility: PrayerRequestVisibility;
      isAnonymous?: boolean;
    },
  ) {
    return this.prayersService.create(
      churchId,
      user.churchPersonId,
      body.motive,
      body.visibility,
      body.isAnonymous,
    );
  }

  @Put(':id')
  update(
    @CurrentChurch() churchId: string,
    @Param('id') id: string,
    @CurrentUser() user: SecurityContext,
    @Body() body: { motive: string },
  ) {
    return this.prayersService.update(id, churchId, user.churchPersonId, body.motive);
  }

  @Put(':id/answer')
  markAnswered(
    @CurrentChurch() churchId: string,
    @Param('id') id: string,
    @CurrentUser() user: SecurityContext,
    @Body() body: { testimony?: string },
  ) {
    return this.prayersService.markAnswered(id, churchId, user.churchPersonId, body.testimony);
  }

  @Post(':id/updates')
  addUpdate(
    @CurrentChurch() churchId: string,
    @Param('id') id: string,
    @CurrentUser() user: SecurityContext,
    @Body() body: { content: string },
  ) {
    return this.prayersService.addUpdate(id, churchId, user.churchPersonId, body.content);
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
  delete(@CurrentChurch() churchId: string, @Param('id') id: string, @CurrentUser() user: SecurityContext) {
    return this.prayersService.delete(id, churchId, user.churchPersonId, user.permissions || []);
  }
}

