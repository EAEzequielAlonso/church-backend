import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NeedSignal } from '../entities/need-signal.entity';
import { NeedEngagement } from '../entities/need-engagement.entity';
import { Person } from '../../../core/users/entities/person.entity';
import { EcosystemActivitiesService } from '../../ecosystem/services/ecosystem-activities.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NeedEntityType,
  NeedEngagementType,
  NeedEngagementStatus,
} from '../enums/need-signals.enum';
import {
  EcosystemActivityType,
  EcosystemActivityEntityType,
} from '../../ecosystem/enums/ecosystem.enums';

@Injectable()
export class RecordNeedSignalContactAttemptUseCase {
  constructor(
    @InjectRepository(NeedSignal)
    private readonly needSignalRepository: Repository<NeedSignal>,
    @InjectRepository(NeedEngagement)
    private readonly needEngagementRepository: Repository<NeedEngagement>,
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    private readonly activitiesService: EcosystemActivitiesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    personId: string,
    signalId: string,
    method: string,
  ): Promise<void> {
    const signal = await this.needSignalRepository.findOne({
      where: { id: signalId },
      relations: ['needLocation'],
    });

    if (!signal) {
      throw new NotFoundException('Need Signal no encontrado');
    }

    if (signal.personId === personId) {
      // Regla de dominio: no registrar si el creador de la señal es quien intenta el contacto
      return;
    }

    const existingEngagements = await this.needEngagementRepository.find({
      where: {
        entityType: NeedEntityType.PERSONAL_NEED,
        entityId: signal.id,
        personId,
        type: NeedEngagementType.CONTACT,
      },
    });

    const hasPendingOrAccepted = existingEngagements.some(
      (e) =>
        e.status === NeedEngagementStatus.PENDING ||
        e.status === NeedEngagementStatus.ACCEPTED,
    );

    if (hasPendingOrAccepted) {
      // Regla de prevención de spam: si ya hay una PENDING o ACCEPTED, no permitir otra.
      return;
    }

    const hasRejected = existingEngagements.some(
      (e) => e.status === NeedEngagementStatus.REJECTED,
    );
    if (hasRejected) {
      // TODO: Política de reintento.
      // En el futuro definir si permitir reintentar después de X días o impedir nuevos intentos.
      // Por ahora, bloqueamos nuevos intentos si ya fue rechazado.
      return;
    }

    const engagement = this.needEngagementRepository.create({
      entityType: NeedEntityType.PERSONAL_NEED,
      entityId: signal.id,
      personId,
      type: NeedEngagementType.CONTACT,
      status: NeedEngagementStatus.PENDING, // Forzamos PENDING (sobrescribe el default ACTIVE)
      notes: `Intento de contacto inicial vía ${method}`,
    });
    await this.needEngagementRepository.save(engagement);

    await this.activitiesService.logActivity({
      actorPersonId: personId,
      activityType: EcosystemActivityType.NEED_ENGAGEMENT_STARTED,
      entityId: signal.id,
      entityType: EcosystemActivityEntityType.NEED_SIGNAL,
      country: signal.needLocation?.country,
      state: signal.needLocation?.state,
      city: signal.needLocation?.city,
      metadata: {
        engagementType: 'CONTACT',
      },
    });

    const person = await this.personRepository.findOne({
      where: { id: signal.personId },
      relations: ['user'],
    });
    const supporter = await this.personRepository.findOne({
      where: { id: personId },
    });
    this.eventEmitter.emit('personal-need.supported', {
      recipientPersonId: signal.personId,
      email: person?.user?.email,
      supporterName: supporter?.firstName
        ? `${supporter.firstName} ${supporter.lastName}`
        : 'Un miembro de la comunidad',
      needTitle: signal.note?.substring(0, 50) || 'Tu necesidad',
    });
  }
}
