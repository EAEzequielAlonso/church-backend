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

import { GetMyNotificationsUseCase } from './use-cases/get-my-notifications.use-case';
import { GetUnreadCountUseCase } from './use-cases/get-unread-count.use-case';
import { MarkNotificationAsReadUseCase } from './use-cases/mark-notification-as-read.use-case';
import { MarkAllNotificationsAsReadUseCase } from './use-cases/mark-all-notifications-as-read.use-case';
import { SecurityContextGuard } from 'src/core/auth/guards/security-context.guard';
import { PermissionsGuard } from 'src/core/auth/guards/permissions.guard';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { AppPermission } from 'src/core/auth/authorization/permissions.enum';
import { RequirePermissions } from 'src/core/auth/decorators/require-permissions.decorator';
import { SecurityContext } from 'src/core/auth/security-context.interface';
import { CurrentChurch, CurrentUser } from 'src/common/decorators';

@Controller('notifications')
@UseGuards(JwtAuthGuard, SecurityContextGuard)
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
    @CurrentUser() securityContext: SecurityContext,
    @Query('limit') limit?: string,
  ) {
    return this.getMyNotifications.execute(
      null, // churchId not required for user notifications
      securityContext.userId,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  /** GET /notifications/unread-count — number badge for the bell */
  @Get('unread-count')
  unreadCount(@CurrentUser() securityContext: SecurityContext) {
    return this.getUnreadCount
      .execute(null, securityContext.userId)
      .then((count) => ({ count }));
  }

  /** PATCH /notifications/:id/read — mark one as read */
  @Patch(':id/read')
  markOne(
    @CurrentUser() securityContext: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.markAsRead.execute(null, securityContext.userId, id);
  }

  /** POST /notifications/read-all — mark all as read */
  @Post('read-all')
  markAll(@CurrentUser() securityContext: SecurityContext) {
    return this.markAllAsRead
      .execute(securityContext.userId)
      .then(() => ({ ok: true }));
  }
}
