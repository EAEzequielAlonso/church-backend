import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ChurchNeedSignal } from '../entities/church-need-signal.entity';
import { NeedLocation } from '../entities/need-location.entity';
import { ChurchNeedSignalSupport } from '../entities/church-need-signal-support.entity';
import { NeedInformation } from '../entities/need-information.entity';
import { EcosystemContributionsService } from '../../ecosystem/services/ecosystem-contributions.service';
import { EcosystemActivitiesService } from '../../ecosystem/services/ecosystem-activities.service';
import { CreateChurchNeedSignalDto } from '../dto/church-need-signals/create-church-need-signal.dto';
import { AddNeedInformationDto } from '../dto/church-need-signals/add-need-information.dto';
import {
  ChurchNeedSignalFilterDto,
  ChurchNeedSignalSortBy,
} from '../dto/church-need-signals/church-need-signal-filter.dto';
import { InformationFilterDto } from '../dto/church-need-signals/information-filter.dto';
import {
  EcosystemContributionType,
  EcosystemActivityType,
  EcosystemActivityEntityType,
} from '../../ecosystem/enums/ecosystem.enums';
import { NeedInformationEntityType } from '../enums/need-signals.enum';
import { GeoNormalizationUtil } from '../../ecosystem/geo/utils/geo-normalization.util';
import { NeedSignalStatus } from 'src/public/enums/public.enums';

@Injectable()
export class ChurchNeedSignalsService {
  constructor(
    @InjectRepository(ChurchNeedSignal)
    private readonly signalRepo: Repository<ChurchNeedSignal>,
    @InjectRepository(NeedLocation)
    private readonly locationRepo: Repository<NeedLocation>,
    @InjectRepository(ChurchNeedSignalSupport)
    private readonly supportRepo: Repository<ChurchNeedSignalSupport>,
    @InjectRepository(NeedInformation)
    private readonly infoRepo: Repository<NeedInformation>,
    private readonly contributionsService: EcosystemContributionsService,
    private readonly activitiesService: EcosystemActivitiesService,
    private readonly dataSource: DataSource,
  ) {}

  async createSignal(personId: string, dto: CreateChurchNeedSignalDto) {
    return this.dataSource.transaction(async (manager) => {
      // 1. Get or create location
      const nCountry = GeoNormalizationUtil.normalizeString(dto.country);
      const nState = GeoNormalizationUtil.normalizeString(dto.state);
      const nCity = GeoNormalizationUtil.normalizeString(dto.city);

      let location = await manager.findOne(NeedLocation, {
        where: {
          country: nCountry,
          state: nState,
          city: nCity,
        },
      });

      if (!location) {
        location = manager.create(NeedLocation, {
          country: nCountry,
          state: nState,
          city: nCity,
          latitude: dto.latitude,
          longitude: dto.longitude,
        });
        await manager.save(NeedLocation, location);
      }

      // 2. Check if signal already exists
      const existingSignal = await manager.findOne(ChurchNeedSignal, {
        where: { needLocationId: location.id },
      });

      if (existingSignal) {
        throw new ConflictException(
          'A church need signal already exists for this location.',
        );
      }

      // 3. Create signal
      const signal = manager.create(ChurchNeedSignal, {
        personId,
        needLocationId: location.id,
        observation: dto.observation,
      });

      await manager.save(ChurchNeedSignal, signal);

      // 4. Register contribution & activity
      await this.contributionsService.recordContribution({
        actorPersonId: personId,
        targetChurchId: null, // No church target
        type: EcosystemContributionType.CHURCH_NEED_SIGNAL_CREATED,
        manager,
      });

      await this.activitiesService.logActivity(
        {
          actorPersonId: personId,
          activityType: EcosystemActivityType.CHURCH_NEED_SIGNAL_CREATED,
          entityId: signal.id,
          entityType: EcosystemActivityEntityType.CHURCH_NEED_SIGNAL,
          country: location.country,
          state: location.state,
          city: location.city,
        },
        manager,
      );

      return signal;
    });
  }

  async supportSignal(personId: string, signalId: string) {
    const signal = await this.signalRepo.findOne({ where: { id: signalId } });
    if (!signal) {
      throw new NotFoundException('Church need signal not found');
    }

    const existingSupport = await this.supportRepo.findOne({
      where: { churchNeedSignalId: signalId, personId },
    });

    if (existingSupport) {
      throw new ConflictException('You have already supported this signal.');
    }

    const support = this.supportRepo.create({
      churchNeedSignalId: signalId,
      personId,
    });

    await this.supportRepo.save(support);
    return support;
  }

  async listSignals(filterDto: ChurchNeedSignalFilterDto) {
    const { country, state, city, sortBy, page = 1, limit = 10 } = filterDto;

    const query = this.signalRepo
      .createQueryBuilder('signal')
      .leftJoinAndSelect('signal.needLocation', 'location')
      .leftJoinAndSelect('signal.person', 'creator')
      .where('signal.status = :status', { status: NeedSignalStatus.OPEN });

    if (country) query.andWhere('location.country = :country', { country });
    if (state) query.andWhere('location.state = :state', { state });
    if (city) query.andWhere('location.city = :city', { city });

    // Subquery for support count
    query.loadRelationCountAndMap(
      'signal.supportCount',
      'signal.supports',
      'supports',
    );

    if (sortBy === ChurchNeedSignalSortBy.DATE_DESC) {
      query.orderBy('signal.createdAt', 'DESC');
    } else if (sortBy === ChurchNeedSignalSortBy.SUPPORTS_DESC) {
      // For supports desc, typeorm relation count ordering is tricky in loadRelationCountAndMap
      // We will add a select for it
      query
        .addSelect((subQuery) => {
          return subQuery
            .select('COUNT(support.id)', 'count')
            .from(ChurchNeedSignalSupport, 'support')
            .where('support.churchNeedSignalId = signal.id');
        }, 'supports_count')
        .orderBy('supports_count', 'DESC');
    }

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

  async getSignalDetail(signalId: string) {
    const signal = await this.signalRepo
      .createQueryBuilder('signal')
      .leftJoinAndSelect('signal.needLocation', 'location')
      .leftJoinAndSelect('signal.person', 'creator')
      .where('signal.id = :signalId', { signalId })
      .getOne();

    if (!signal) {
      throw new NotFoundException('Church need signal not found');
    }

    const supportCount = await this.supportRepo.count({
      where: { churchNeedSignalId: signalId },
    });

    const recentInfo = await this.infoRepo.find({
      where: {
        entityType: NeedInformationEntityType.CHURCH_NEED_SIGNAL,
        entityId: signalId,
      },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    return {
      ...signal,
      supportCount,
      recentInformation: recentInfo,
    };
  }

  async addInformation(
    personId: string,
    signalId: string,
    dto: AddNeedInformationDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const signal = await manager.findOne(ChurchNeedSignal, {
        where: { id: signalId },
        relations: ['needLocation'],
      });

      if (!signal) {
        throw new NotFoundException('Church need signal not found');
      }

      const info = manager.create(NeedInformation, {
        personId,
        entityType: NeedInformationEntityType.CHURCH_NEED_SIGNAL,
        entityId: signalId,
        category: dto.category,
        title: dto.title,
        content: dto.content,
        attachments: dto.attachments,
      });

      await manager.save(NeedInformation, info);

      await this.contributionsService.recordContribution({
        actorPersonId: personId,
        targetChurchId: null,
        type: EcosystemContributionType.NEED_INFORMATION_ADDED,
        manager,
      });

      await this.activitiesService.logActivity(
        {
          actorPersonId: personId,
          activityType: EcosystemActivityType.NEED_INFORMATION_ADDED,
          entityId: info.id,
          entityType: EcosystemActivityEntityType.CHURCH_NEED_SIGNAL,
          country: signal.needLocation.country,
          state: signal.needLocation.state,
          city: signal.needLocation.city,
        },
        manager,
      );

      return info;
    });
  }

  async listInformation(signalId: string, filterDto: InformationFilterDto) {
    const { category, page = 1, limit = 10 } = filterDto;

    const query = this.infoRepo
      .createQueryBuilder('info')
      .leftJoinAndSelect('info.person', 'person')
      .where('info.entityType = :entityType', {
        entityType: NeedInformationEntityType.CHURCH_NEED_SIGNAL,
      })
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
    const signal = await this.signalRepo.findOne({
      where: { id },
      relations: ['needLocation'],
    });
    if (!signal) return null;
    return {
      id: signal.id,
      title: 'Necesidad Ministerial',
      type: 'CHURCH_NEED_SIGNAL',
      description: signal.observation?.slice(0, 150) ?? null,
      city: signal.needLocation?.city,
      state: signal.needLocation?.state,
      ctaLink: `/church-need-signals/${signal.id}`,
    };
  }
}
