import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class MarkNotificationAsReadUseCase {
  constructor(
    @InjectRepository(Notification)
    private repo: Repository<Notification>,
  ) {}

  async execute(
    churchId: string | null,
    userId: string,
    notificationId: string,
  ): Promise<Notification> {
    const notification = await this.repo.findOne({
      where: { id: notificationId, userId },
    });
    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }
    if (!notification.read) {
      notification.read = true;
      notification.readAt = new Date();
      await this.repo.save(notification);
    }
    return notification;
  }
}
