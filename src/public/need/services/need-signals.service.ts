import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NeedSignal } from '../entities/need-signal.entity';
import { NeedLocation } from '../entities/need-location.entity';
import { EcosystemContributionsService } from '../../ecosystem/services/ecosystem-contributions.service';
import { EcosystemContributionType } from '../../ecosystem/enums/ecosystem.enums';
import { CreateOrUpdateNeedSignalDto } from '../dto/need-signal.dto';
import { NeedSignalStatus } from '../../enums/public.enums';
import { Person } from '../../../core/users/entities/person.entity';
import { GeoNormalizationUtil } from '../../ecosystem/geo/utils/geo-normalization.util';
import { GeoService } from '../../ecosystem/geo/geo.service';
import { NeedEngagement } from '../entities/need-engagement.entity';
import { NeedInformation } from '../entities/need-information.entity';
import { NeedEngagementType, NeedEntityType, NeedInformationEntityType } from '../enums/need-signals.enum';
import { EcosystemActivitiesService } from '../../ecosystem/services/ecosystem-activities.service';
import { EcosystemActivityType, EcosystemActivityEntityType } from '../../ecosystem/enums/ecosystem.enums';
import { AddNeedInformationDto } from '../dto/church-need-signals/add-need-information.dto';
import { InformationFilterDto } from '../dto/church-need-signals/information-filter.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class NeedSignalsService {
  constructor(
    @InjectRepository(NeedSignal)
    private readonly needSignalRepository: Repository<NeedSignal>,
    @InjectRepository(NeedLocation)
    private readonly needLocationRepository: Repository<NeedLocation>,
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(NeedEngagement)
    private readonly needEngagementRepository: Repository<NeedEngagement>,
    @InjectRepository(NeedInformation)
    private readonly needInformationRepository: Repository<NeedInformation>,
    private readonly ecosystemContributionsService: EcosystemContributionsService,
    private readonly activitiesService: EcosystemActivitiesService,
    private readonly geoService: GeoService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async createOrUpdate(personId: string, dto: CreateOrUpdateNeedSignalDto): Promise<NeedSignal> {
    const person = await this.personRepository.findOne({ where: { id: personId } });
    if (!person) throw new NotFoundException('Person no encontrada');

    if (!person.country || !person.state || !person.city) {
      throw new BadRequestException('Tu perfil no tiene una ciudad configurada. Actualízalo para continuar.');
    }

    const nCountry = GeoNormalizationUtil.normalizeString(person.country);
    const nState = GeoNormalizationUtil.normalizeString(person.state);
    const nCity = GeoNormalizationUtil.normalizeString(person.city);

    let needLocation = await this.needLocationRepository.findOne({
      where: {
        country: nCountry,
        state: nState,
        city: nCity
      }
    });

    if (!needLocation) {
      // Geocode the city once
      try {
        const geoResult = await this.geoService.geocodeChurchAddress({
          country: nCountry,
          state: nState,
          city: nCity
        });

        needLocation = this.needLocationRepository.create({
          country: nCountry,
          state: nState,
          city: nCity,
          latitude: geoResult.latitude,
          longitude: geoResult.longitude,
        });
        needLocation = await this.needLocationRepository.save(needLocation);
      } catch (err) {
        throw new BadRequestException('No pudimos localizar geográficamente tu ciudad. Por favor intenta más tarde o revisa tu perfil.');
      }
    }

    const existingOpenSignal = await this.needSignalRepository.findOne({
      where: { personId, status: NeedSignalStatus.OPEN },
    });

    if (existingOpenSignal) {
      if (existingOpenSignal.needLocationId !== needLocation.id) {
        throw new BadRequestException('ACTUAL_SIGNAL_OTHER_CITY');
      }

      Object.assign(existingOpenSignal, {
        note: dto.note ?? existingOpenSignal.note,
        impactedPeopleCount: dto.impactedPeopleCount ?? existingOpenSignal.impactedPeopleCount,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        contactUrl: dto.contactUrl,
      });
      return this.needSignalRepository.save(existingOpenSignal);
    }

    const newSignal = this.needSignalRepository.create({
      personId,
      needLocationId: needLocation.id,
      status: NeedSignalStatus.OPEN,
      note: dto.note,
      impactedPeopleCount: dto.impactedPeopleCount ?? 1,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      contactUrl: dto.contactUrl,
    });

    const savedSignal = await this.needSignalRepository.save(newSignal);

    await this.activitiesService.logActivity({
      actorPersonId: personId,
      activityType: EcosystemActivityType.NEED_SIGNAL_CREATED,
      entityId: savedSignal.id,
      entityType: EcosystemActivityEntityType.NEED_SIGNAL,
      country: needLocation.country,
      state: needLocation.state,
      city: needLocation.city,
    });

    return savedSignal;
  }

  async closeSignal(personId: string, id: string): Promise<NeedSignal> {
    const signal = await this.needSignalRepository.findOne({
      where: { id, personId },
      relations: ['needLocation'],
    });

    if (!signal) {
      throw new NotFoundException('Need Signal no encontrado');
    }

    signal.status = NeedSignalStatus.CLOSED;
    const savedSignal = await this.needSignalRepository.save(signal);

    const engagement = this.needEngagementRepository.create({
      entityType: NeedEntityType.PERSONAL_NEED,
      entityId: savedSignal.id,
      personId,
      type: NeedEngagementType.RESOLVED,
      notes: 'Resolvió su propia necesidad.',
    });
    await this.needEngagementRepository.save(engagement);

    await this.activitiesService.logActivity({
      actorPersonId: personId,
      activityType: EcosystemActivityType.NEED_SIGNAL_RESOLVED,
      entityId: savedSignal.id,
      entityType: EcosystemActivityEntityType.NEED_SIGNAL,
      country: savedSignal.needLocation?.country,
      state: savedSignal.needLocation?.state,
      city: savedSignal.needLocation?.city,
    });

    return savedSignal;
  }

  async recordContactAttempt(personId: string, signalId: string, method: string): Promise<void> {
    const signal = await this.needSignalRepository.findOne({
      where: { id: signalId },
      relations: ['needLocation'],
    });

    if (!signal) {
      throw new NotFoundException('Need Signal no encontrado');
    }

    if (signal.personId === personId) {
      // Don't record if it's the owner clicking their own link
      return;
    }

    const existingEngagement = await this.needEngagementRepository.findOne({
      where: {
        entityType: NeedEntityType.PERSONAL_NEED,
        entityId: signal.id,
        personId,
        type: NeedEngagementType.CONTACT,
      }
    });

    if (existingEngagement) {
      return;
    }

    const engagement = this.needEngagementRepository.create({
      entityType: NeedEntityType.PERSONAL_NEED,
      entityId: signal.id,
      personId,
      type: NeedEngagementType.CONTACT,
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
      }
    });

    const person = await this.personRepository.findOne({ where: { id: signal.personId }, relations: ['user'] });
    const supporter = await this.personRepository.findOne({ where: { id: personId } });
    this.eventEmitter.emit('personal-need.supported', {
      recipientPersonId: signal.personId,
      email: person?.user?.email,
      supporterName: supporter?.firstName ? `${supporter.firstName} ${supporter.lastName}` : 'Un miembro de la comunidad',
      needTitle: signal.note?.substring(0, 50) || 'Tu necesidad',
    });
  }

  async findMySignals(personId: string): Promise<NeedSignal[]> {
    return this.needSignalRepository.find({
      where: { personId },
      relations: ['needLocation'],
      order: { createdAt: 'DESC' },
    });
  }

  async getMapSignals(): Promise<any[]> {
    const locations = await this.needLocationRepository.find();

    const signals = await this.needSignalRepository.find({
      where: { status: NeedSignalStatus.OPEN },
      relations: ['person', 'needLocation'],
    });

    const churchesRepo = this.needSignalRepository.manager.getRepository('church_public_profiles');
    const verifiedChurches = await churchesRepo.find({
      where: { lifecycleState: 'VERIFIED' }
    });

    // Group signals by location
    const result = locations.map(loc => {
      const locationSignals = signals.filter(s => s.needLocationId === loc.id);
      if (locationSignals.length === 0) return null;

      const totalImpacted = locationSignals.reduce((acc, s) => acc + s.impactedPeopleCount, 0);

      const verifiedChurchesCount = verifiedChurches.filter(c => (c as any).geoCity === loc.city).length;

      return {
        id: loc.id,
        country: loc.country,
        state: loc.state,
        city: loc.city,
        latitude: loc.latitude,
        longitude: loc.longitude,
        totalSignals: locationSignals.length,
        totalImpacted: totalImpacted,
        verifiedChurchesCount: verifiedChurchesCount,
        signals: locationSignals.map(signal => ({
          id: signal.id,
          note: signal.note,
          impactedPeopleCount: signal.impactedPeopleCount,
          contactEmail: signal.contactEmail,
          contactPhone: signal.contactPhone,
          contactUrl: signal.contactUrl,
          createdAt: signal.createdAt,
          person: {
            firstName: signal.person.firstName,
            lastName: signal.person.lastName,
            avatarUrl: signal.person.avatarUrl,
            slug: signal.person.slug,
          },
        })),
      };
    }).filter(loc => loc !== null);

    return result;
  }

  async addInformation(personId: string, signalId: string, dto: AddNeedInformationDto) {
    const signal = await this.needSignalRepository.findOne({
      where: { id: signalId },
      relations: ['needLocation'],
    });

    if (!signal) {
      throw new NotFoundException('Need Signal no encontrado');
    }

    const info = this.needInformationRepository.create({
      personId,
      entityType: NeedInformationEntityType.NEED_SIGNAL,
      entityId: signalId,
      category: dto.category,
      title: dto.title,
      content: dto.content,
      attachments: dto.attachments,
    });

    const savedInfo = await this.needInformationRepository.save(info);

    await this.ecosystemContributionsService.recordContribution({
      actorPersonId: personId,
      targetChurchId: null,
      type: EcosystemContributionType.NEED_INFORMATION_ADDED,
      metadata: {
        signalId,
        infoId: savedInfo.id,
        geoCity: signal.needLocation?.city,
        geoState: signal.needLocation?.state,
        geoCountry: signal.needLocation?.country,
      }
    });

    return savedInfo;
  }

  async listInformation(signalId: string, filterDto: InformationFilterDto) {
    const { category, page = 1, limit = 10 } = filterDto;

    const query = this.needInformationRepository.createQueryBuilder('info')
      .leftJoinAndSelect('info.person', 'person')
      .where('info.entityType = :entityType', { entityType: NeedInformationEntityType.NEED_SIGNAL })
      .andWhere('info.entityId = :signalId', { signalId });

    if (category) {
      query.andWhere('info.category = :category', { category });
    }

    query.orderBy('info.createdAt', 'DESC');
    query.skip((page - 1) * limit);
    query.take(limit);

    const [items, total] = await query.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async mapSummary(id: string) {
    const signal = await this.needSignalRepository.findOne({ where: { id }, relations: ['needLocation'] });
    if (!signal) return null;
    return {
      id: signal.id,
      title: 'Señal de Necesidad',
      type: 'NEED_SIGNAL',
      description: signal.note?.slice(0, 150) ?? null,
      city: signal.needLocation?.city,
      state: signal.needLocation?.state,
      ctaLink: `/need-signals/${signal.id}`
    };
  }
}
