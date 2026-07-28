import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NeedEngagement } from '../entities/need-engagement.entity';
import { NeedSignal } from '../entities/need-signal.entity';
import {
  NeedEngagementStatus,
  NeedEntityType,
} from '../enums/need-signals.enum';

@Injectable()
export class RejectPersonalNeedSignalContactUseCase {
  constructor(
    @InjectRepository(NeedEngagement)
    private readonly needEngagementRepository: Repository<NeedEngagement>,
    @InjectRepository(NeedSignal)
    private readonly needSignalRepository: Repository<NeedSignal>,
  ) {}

  async execute(ownerPersonId: string, engagementId: string): Promise<void> {
    const engagement = await this.needEngagementRepository.findOne({
      where: { id: engagementId, entityType: NeedEntityType.PERSONAL_NEED },
    });

    if (!engagement) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    const signal = await this.needSignalRepository.findOne({
      where: { id: engagement.entityId },
    });

    if (!signal) {
      throw new NotFoundException('Need Signal no encontrada');
    }

    if (signal.personId !== ownerPersonId) {
      throw new ForbiddenException(
        'No tienes permiso para rechazar esta solicitud',
      );
    }

    if (engagement.status !== NeedEngagementStatus.PENDING) {
      throw new BadRequestException(
        `La solicitud ya se encuentra en estado ${engagement.status}`,
      );
    }

    engagement.status = NeedEngagementStatus.REJECTED;
    await this.needEngagementRepository.save(engagement);
  }
}
