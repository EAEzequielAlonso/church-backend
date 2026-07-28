import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class GetUnreadCountUseCase {
  constructor(
    @InjectRepository(Notification)
    private repo: Repository<Notification>,
  ) {}

  async execute(churchId: string | null, userId: string): Promise<number> {
    return this.repo.count({
      where: { userId, read: false },
    });
  }
}
