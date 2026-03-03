import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class MarkAllNotificationsAsReadUseCase {
    constructor(
        @InjectRepository(Notification)
        private repo: Repository<Notification>,
    ) { }

    async execute(churchId: string, userId: string): Promise<void> {
        await this.repo.update(
            { churchId, userId, read: false },
            { read: true, readAt: new Date() },
        );
    }
}
