import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  UseGuards,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SecurityContextGuard } from '../auth/guards/security-context.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AppPermission } from '../auth/authorization/permissions.enum';
import { CurrentChurch, CurrentUser } from '../common/decorators';
import { SecurityContext } from '../auth/security-context.interface';

import { GetMyNotificationsUseCase } from './use-cases/get-my-notifications.use-case';
import { GetUnreadCountUseCase } from './use-cases/get-unread-count.use-case';
import { MarkNotificationAsReadUseCase } from './use-cases/mark-notification-as-read.use-case';
import { MarkAllNotificationsAsReadUseCase } from './use-cases/mark-all-notifications-as-read.use-case';

@Controller('notifications')
@UseGuards(JwtAuthGuard, SecurityContextGuard, PermissionsGuard)
@RequirePermissions(AppPermission.MEMBER_VIEW)
export class NotificationsController {
  constructor(
    private readonly getMyNotifications: GetMyNotificationsUseCase,
    private readonly getUnreadCount: GetUnreadCountUseCase,
    private readonly markAsRead: MarkNotificationAsReadUseCase,
    private readonly markAllAsRead: MarkAllNotificationsAsReadUseCase,
  ) {}

  /** GET /notifications — last 20 notifications for the current user */
  @Get()
  findMine(
    @CurrentChurch() churchId: string,
    @CurrentUser() securityContext: SecurityContext,
    @Query('limit') limit?: string,
  ) {
    return this.getMyNotifications.execute(
      churchId,
      securityContext.userId,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  /** GET /notifications/unread-count — number badge for the bell */
  @Get('unread-count')
  unreadCount(
    @CurrentChurch() churchId: string,
    @CurrentUser() securityContext: SecurityContext,
  ) {
    return this.getUnreadCount
      .execute(churchId, securityContext.userId)
      .then((count) => ({ count }));
  }

  /** PATCH /notifications/:id/read — mark one as read */
  @Patch(':id/read')
  markOne(
    @CurrentChurch() churchId: string,
    @CurrentUser() securityContext: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.markAsRead.execute(churchId, securityContext.userId, id);
  }

  /** POST /notifications/read-all — mark all as read */
  @Post('read-all')
  markAll(
    @CurrentChurch() churchId: string,
    @CurrentUser() securityContext: SecurityContext,
  ) {
    return this.markAllAsRead
      .execute(churchId, securityContext.userId)
      .then(() => ({ ok: true }));
  }
}

