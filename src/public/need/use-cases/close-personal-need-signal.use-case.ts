import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NeedSignal } from '../entities/need-signal.entity';
import { NeedEngagement } from '../entities/need-engagement.entity';
import {
  NeedSignalStatus,
  NeedSignalCloseReason,
} from '../../enums/public.enums';
import { EcosystemActivitiesService } from '../../ecosystem/services/ecosystem-activities.service';
import {
  EcosystemActivityType,
  EcosystemActivityEntityType,
} from '../../ecosystem/enums/ecosystem.enums';
import {
  NeedEntityType,
  NeedEngagementType,
  NeedEngagementStatus,
} from '../enums/need-signals.enum';

@Injectable()
export class ClosePersonalNeedSignalUseCase {
  constructor(
    @InjectRepository(NeedSignal)
    private readonly needSignalRepository: Repository<NeedSignal>,
    @InjectRepository(NeedEngagement)
    private readonly needEngagementRepository: Repository<NeedEngagement>,
    private readonly activitiesService: EcosystemActivitiesService,
  ) {}

  async execute(
    personId: string,
    id: string,
    reason: NeedSignalCloseReason,
  ): Promise<NeedSignal> {
    const signal = await this.needSignalRepository.findOne({
      where: { id, personId }, // Domain rule: Only owner can close
      relations: ['needLocation'],
    });

    if (!signal) {
      throw new NotFoundException(
        'Need Signal no encontrada o no tienes permisos para cerrarla.',
      );
    }

    signal.status = NeedSignalStatus.CLOSED;
    signal.closeReason = reason;
    const savedSignal = await this.needSignalRepository.save(signal);

    const isResolved = reason === NeedSignalCloseReason.RESOLVED;

    if (isResolved) {
      const engagement = this.needEngagementRepository.create({
        entityType: NeedEntityType.PERSONAL_NEED,
        entityId: savedSignal.id,
        personId,
        type: NeedEngagementType.RESOLVED,
        status: NeedEngagementStatus.COMPLETED,
        notes: 'Resolvió su propia necesidad.',
      });
      await this.needEngagementRepository.save(engagement);
    }

    if (isResolved) {
      await this.activitiesService.logActivity({
        actorPersonId: personId,
        activityType: EcosystemActivityType.NEED_SIGNAL_RESOLVED,
        entityId: savedSignal.id,
        entityType: EcosystemActivityEntityType.NEED_SIGNAL,
        country: savedSignal.needLocation?.country,
        state: savedSignal.needLocation?.state,
        city: savedSignal.needLocation?.city,
      });
    }

    return savedSignal;
  }
}
