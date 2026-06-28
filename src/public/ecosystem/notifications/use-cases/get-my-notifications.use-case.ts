import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class GetMyNotificationsUseCase {
    constructor(
        @InjectRepository(Notification)
        private repo: Repository<Notification>,
    ) { }

    async execute(churchId: string | null, userId: string, limit = 20): Promise<Notification[]> {
        return this.repo.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }
}
