import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from '../entities/notification.entity';

interface CreateNotificationInput {
    churchId: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    entityType?: string;
    entityId?: string;
}

@Injectable()
export class CreateNotificationUseCase {
    constructor(
        @InjectRepository(Notification)
        private repo: Repository<Notification>,
    ) { }

    /**
     * Create a notification for a specific user in a church.
     * Safe to call fire-and-forget — errors are swallowed so they
     * never break the calling transaction.
     */
    async execute(input: CreateNotificationInput): Promise<void> {
        try {
            const notification = this.repo.create(input);
            await this.repo.save(notification);
        } catch {
            // Notifications are non-critical — never propagate errors to callers
        }
    }

    /**
     * Create the same notification for multiple users at once
     * (e.g. notifying all LIBRARIANs).
     */
    async executeMany(inputs: CreateNotificationInput[]): Promise<void> {
        if (!inputs.length) return;
        try {
            const notifications = inputs.map((i) => this.repo.create(i));
            await this.repo.save(notifications);
        } catch {
            // Non-critical — swallow errors
        }
    }
}
