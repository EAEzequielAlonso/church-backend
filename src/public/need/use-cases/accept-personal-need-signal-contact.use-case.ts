import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NeedEngagement } from '../entities/need-engagement.entity';
import { NeedSignal } from '../entities/need-signal.entity';
import {
  NeedEngagementStatus,
  NeedEntityType,
} from '../enums/need-signals.enum';
import { EcosystemActivitiesService } from '../../ecosystem/services/ecosystem-activities.service';
import { EcosystemContributionsService } from '../../ecosystem/services/ecosystem-contributions.service';
import {
  EcosystemActivityType,
  EcosystemActivityEntityType,
  EcosystemContributionType,
} from '../../ecosystem/enums/ecosystem.enums';
import { AnonymizationUtil } from '../utils/anonymization.util';

@Injectable()
export class AcceptPersonalNeedSignalContactUseCase {
  constructor(
    @InjectRepository(NeedEngagement)
    private readonly needEngagementRepository: Repository<NeedEngagement>,
    @InjectRepository(NeedSignal)
    private readonly needSignalRepository: Repository<NeedSignal>,
    private readonly activitiesService: EcosystemActivitiesService,
    private readonly contributionsService: EcosystemContributionsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(ownerPersonId: string, engagementId: string): Promise<void> {
    const engagement = await this.needEngagementRepository.findOne({
      where: { id: engagementId, entityType: NeedEntityType.PERSONAL_NEED },
      relations: ['person'],
    });

    if (!engagement) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    const signal = await this.needSignalRepository.findOne({
      where: { id: engagement.entityId },
      relations: ['needLocation', 'person'],
    });

    if (!signal) {
      throw new NotFoundException('Need Signal no encontrada');
    }

    if (signal.personId !== ownerPersonId) {
      throw new ForbiddenException(
        'No tienes permiso para aceptar esta solicitud',
      );
    }

    if (engagement.status !== NeedEngagementStatus.PENDING) {
      throw new BadRequestException(
        `La solicitud ya se encuentra en estado ${engagement.status}`,
      );
    }

    engagement.status = NeedEngagementStatus.ACCEPTED;
    await this.needEngagementRepository.save(engagement);

    // Register Activity: NEED_SIGNAL_CONTACT_ACCEPTED
    // Actor: The supporter (Persona B) who was accepted.
    await this.activitiesService.logActivity({
      actorPersonId: engagement.personId,
      activityType: EcosystemActivityType.NEED_SIGNAL_CONTACT_ACCEPTED,
      entityId: signal.id,
      entityType: EcosystemActivityEntityType.NEED_SIGNAL,
      country: signal.needLocation?.country,
      state: signal.needLocation?.state,
      city: signal.needLocation?.city,
      metadata: {
        needSignalId: signal.id,
        locationId: signal.needLocationId,
        recipientPersonId: signal.personId,
        supporterPersonId: engagement.personId,
        ownerFirstName: signal.person?.firstName,
        ownerLastName: signal.person?.lastName,
        ownerAvatarUrl: signal.person?.avatarUrl,
        status: 'ACCEPTED',
      },
    });

    // Register Contribution: PERSONAL_NEED_ASSISTED for Persona B
    await this.contributionsService.recordContribution({
      actorPersonId: engagement.personId,
      targetChurchId: null,
      type: EcosystemContributionType.PERSONAL_NEED_ASSISTED,
      metadata: {
        signalId: signal.id,
        city: signal.needLocation?.city,
        state: signal.needLocation?.state,
        country: signal.needLocation?.country,
      },
    });

    this.eventEmitter.emit('need-signal.contact.accepted', {
      recipientPersonId: engagement.personId,
      ownerName: signal.person?.firstName
        ? `${signal.person.firstName} ${signal.person.lastName}`
        : 'Alguien',
      needTitle: signal.note?.substring(0, 50) || 'una necesidad',
    });
  }
}
