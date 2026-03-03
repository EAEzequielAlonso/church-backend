import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationsController } from './notifications.controller';

import { CreateNotificationUseCase } from './use-cases/create-notification.use-case';
import { GetMyNotificationsUseCase } from './use-cases/get-my-notifications.use-case';
import { GetUnreadCountUseCase } from './use-cases/get-unread-count.use-case';
import { MarkNotificationAsReadUseCase } from './use-cases/mark-notification-as-read.use-case';
import { MarkAllNotificationsAsReadUseCase } from './use-cases/mark-all-notifications-as-read.use-case';

const UseCases = [
    CreateNotificationUseCase,
    GetMyNotificationsUseCase,
    GetUnreadCountUseCase,
    MarkNotificationAsReadUseCase,
    MarkAllNotificationsAsReadUseCase,
];

@Module({
    imports: [TypeOrmModule.forFeature([Notification])],
    controllers: [NotificationsController],
    providers: [...UseCases],
    /**
     * Export CreateNotificationUseCase so other modules (Library, etc.)
     * can import NotificationsModule and inject it.
     */
    exports: [CreateNotificationUseCase],
})
export class NotificationsModule { }
