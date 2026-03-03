import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    UseGuards,
    Request,
    Query,
    ParseUUIDPipe,
    ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentChurch } from '../common/decorators';

import { GetMyNotificationsUseCase } from './use-cases/get-my-notifications.use-case';
import { GetUnreadCountUseCase } from './use-cases/get-unread-count.use-case';
import { MarkNotificationAsReadUseCase } from './use-cases/mark-notification-as-read.use-case';
import { MarkAllNotificationsAsReadUseCase } from './use-cases/mark-all-notifications-as-read.use-case';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
    constructor(
        private readonly getMyNotifications: GetMyNotificationsUseCase,
        private readonly getUnreadCount: GetUnreadCountUseCase,
        private readonly markAsRead: MarkNotificationAsReadUseCase,
        private readonly markAllAsRead: MarkAllNotificationsAsReadUseCase,
    ) { }

    /** GET /notifications — last 20 notifications for the current user */
    @Get()
    findMine(
        @CurrentChurch() churchId: string,
        @Request() req,
        @Query('limit') limit?: string,
    ) {
        return this.getMyNotifications.execute(
            churchId,
            req.user.id,
            limit ? parseInt(limit, 10) : 20,
        );
    }

    /** GET /notifications/unread-count — number badge for the bell */
    @Get('unread-count')
    unreadCount(@CurrentChurch() churchId: string, @Request() req) {
        return this.getUnreadCount.execute(churchId, req.user.id).then(count => ({ count }));
    }

    /** PATCH /notifications/:id/read — mark one as read */
    @Patch(':id/read')
    markOne(
        @CurrentChurch() churchId: string,
        @Request() req,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.markAsRead.execute(churchId, req.user.id, id);
    }

    /** POST /notifications/read-all — mark all as read */
    @Post('read-all')
    markAll(@CurrentChurch() churchId: string, @Request() req) {
        return this.markAllAsRead.execute(churchId, req.user.id).then(() => ({ ok: true }));
    }
}
