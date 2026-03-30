import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Subscription } from './entities/subscription.entity';
import { Church } from '../churches/entities/church.entity';
import { SubscriptionStatus } from '../common/enums';

@Injectable()
export class SubscriptionCronService {
  private readonly logger = new Logger(SubscriptionCronService.name);

  constructor(
    @InjectRepository(Subscription) private subRep: Repository<Subscription>,
    @InjectRepository(Church) private churchRep: Repository<Church>,
  ) {}

  // Run every day at 00:05 AM
  @Cron('5 0 * * *')
  async checkExpiringSubscriptions() {
    this.logger.log('Starting daily subscription expiration check...');
    const now = new Date();
    
    // 1. Mark expired subscriptions where nextPaymentDate < now
    const expiredSubs = await this.subRep.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
        nextPaymentDate: LessThan(now),
      },
      relations: ['church']
    });

    for (const sub of expiredSubs) {
      // Set to EXPIRED
      sub.status = SubscriptionStatus.EXPIRED;
      await this.subRep.save(sub);
      
      const church = sub.church;
      if (church) {
        church.subscriptionStatus = SubscriptionStatus.EXPIRED;
        await this.churchRep.save(church);
      }
      this.logger.log(`Subscription for church ${church?.name} (ID: ${church?.id}) marked as EXPIRED.`);
    }

    // 2. Future notifications (7, 3, 1 days)
    const activeSubs = await this.subRep.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
      },
      relations: ['church']
    });

    for (const sub of activeSubs) {
      if (!sub.nextPaymentDate) continue;
      
      const daysUntilDiff = Math.round((sub.nextPaymentDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
      
      if ([7, 3, 1].includes(daysUntilDiff)) {
        // MOCK NOTIFICATION requested
        this.logger.warn(`[NOTIFICACIÓN] Tu suscripción para la iglesia ${sub.church?.name} está por vencer en ${daysUntilDiff} días. (Simulando envío de email a ADMIN_CHURCH/TESORERO)`);
      }
    }
  }
}
