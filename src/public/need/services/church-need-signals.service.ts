import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { ChurchNeedSignal } from '../entities/church-need-signal.entity';
import { NeedLocation } from '../entities/need-location.entity';
import { ChurchNeedSignalSupport } from '../entities/church-need-signal-support.entity';
import { NeedInformation } from '../entities/need-information.entity';
import { EcosystemContributionsService } from '../../ecosystem/services/ecosystem-contributions.service';
import { EcosystemActivitiesService } from '../../ecosystem/services/ecosystem-activities.service';
import { CreateChurchNeedSignalDto } from '../dto/church-need-signals/create-church-need-signal.dto';
import { ChurchNeedSignalResponseDto } from '../dto/church-need-signals/church-need-signal-response.dto';
import { ChurchNeedSignalMapMarkerDto } from '../dto/church-need-signals/church-need-signal-map-marker.dto';
import { EditChurchNeedSignalDto } from '../dto/church-need-signals/edit-church-need-signal.dto';
import { UpdateChurchNeedSignalStatusDto } from '../dto/church-need-signals/update-church-need-signal-status.dto';
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
import {
  NeedSignalStatus,
  NeedSignalCloseReason,
} from 'src/public/enums/public.enums';
import { MapViewportDto } from 'src/shared/dtos/map-viewport.dto';
import { MapLayerResponseDto } from 'src/shared/dtos/map-layer-response.dto';
import { MapFilterUtil } from 'src/shared/utils/map-filter.util';

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
          metadata: {
            note: dto.observation ?? null,
          },
        },
        manager,
      );

      return signal;
    });
  }

  async supportSignal(personId: string, signalId: string) {
    return this.dataSource.transaction(async (manager) => {
      const signal = await manager.findOne(ChurchNeedSignal, {
        where: { id: signalId },
      });
      if (!signal) {
        throw new NotFoundException('Church need signal not found');
      }

      if (signal.status !== NeedSignalStatus.OPEN) {
        throw new ConflictException('You can only support open signals.');
      }

      const existingSupport = await manager.findOne(ChurchNeedSignalSupport, {
        where: { churchNeedSignalId: signalId, personId },
      });

      if (existingSupport) {
        throw new ConflictException('You have already supported this signal.');
      }

      const support = manager.create(ChurchNeedSignalSupport, {
        churchNeedSignalId: signalId,
        personId,
      });

      await manager.save(ChurchNeedSignalSupport, support);

      await this.contributionsService.recordContribution({
        actorPersonId: personId,
        targetChurchId: null,
        type: EcosystemContributionType.CHURCH_NEED_SIGNAL_SUPPORTED,
        manager,
      });

      return support;
    });
  }

  async editSignal(
    personId: string,
    signalId: string,
    dto: EditChurchNeedSignalDto,
  ) {
    const signal = await this.signalRepo.findOne({ where: { id: signalId } });
    if (!signal) {
      throw new NotFoundException('Church need signal not found');
    }

    if (signal.personId !== personId) {
      throw new ConflictException('You are not the creator of this signal');
    }

    signal.observation = dto.observation;
    return this.signalRepo.save(signal);
  }

  async deleteSignal(personId: string, signalId: string) {
    return this.dataSource.transaction(async (manager) => {
      const signal = await manager.findOne(ChurchNeedSignal, {
        where: { id: signalId },
      });
      if (!signal) {
        throw new NotFoundException('Church need signal not found');
      }

      if (signal.personId !== personId) {
        throw new ConflictException('You are not the creator of this signal');
      }

      // Check for third-party NeedInformation
      const thirdPartyInfoCount = await manager
        .createQueryBuilder(NeedInformation, 'info')
        .where('info.entityType = :entityType', {
          entityType: NeedInformationEntityType.CHURCH_NEED_SIGNAL,
        })
        .andWhere('info.entityId = :signalId', { signalId })
        .andWhere('info.personId != :personId', { personId })
        .getCount();

      if (thirdPartyInfoCount > 0) {
        throw new ConflictException(
          'Cannot delete a signal that has information provided by other users. You can close it instead.',
        );
      }

      // If safe, delete supports and info by creator
      await manager.delete(ChurchNeedSignalSupport, {
        churchNeedSignalId: signalId,
      });
      await manager.delete(NeedInformation, {
        entityType: NeedInformationEntityType.CHURCH_NEED_SIGNAL,
        entityId: signalId,
      });
      await manager.delete(ChurchNeedSignal, { id: signalId });

      return { success: true };
    });
  }

  async updateStatus(
    personId: string,
    signalId: string,
    dto: UpdateChurchNeedSignalStatusDto,
  ) {
    const signal = await this.signalRepo.findOne({ where: { id: signalId } });
    if (!signal) {
      throw new NotFoundException('Church need signal not found');
    }

    if (signal.personId !== personId) {
      throw new ConflictException('You are not the creator of this signal');
    }

    if (dto.status === NeedSignalStatus.CLOSED) {
      // Manual close by creator is always TEMPORARY
      signal.status = NeedSignalStatus.CLOSED;
      signal.closeReason = NeedSignalCloseReason.TEMPORARY;
    } else if (dto.status === NeedSignalStatus.OPEN) {
      // Can only reopen if it was TEMPORARY
      if (
        signal.status !== NeedSignalStatus.CLOSED ||
        signal.closeReason !== NeedSignalCloseReason.TEMPORARY
      ) {
        throw new ConflictException('This signal cannot be manually reopened.');
      }
      signal.status = NeedSignalStatus.OPEN;
      signal.closeReason = null;
    }

    return this.signalRepo.save(signal);
  }

  async listSignals(filterDto: ChurchNeedSignalFilterDto, personId?: string) {
    const {
      country,
      state,
      city,
      sortBy,
      page = 1,
      limit = 10,
      creatorId,
      status,
    } = filterDto;

    const query = this.signalRepo
      .createQueryBuilder('signal')
      .leftJoinAndSelect('signal.needLocation', 'location')
      .leftJoinAndSelect('signal.person', 'creator');

    if (status) {
      if (status !== 'ALL') {
        query.andWhere('signal.status = :status', { status });
      }
    } else {
      query.andWhere('signal.status = :status', {
        status: NeedSignalStatus.OPEN,
      });
    }

    if (creatorId) {
      if (creatorId === 'me') {
        if (personId) {
          query.andWhere('signal.personId = :creatorId', {
            creatorId: personId,
          });
        } else {
          // Si envían 'me' pero no están autenticados, forzamos un resultado vacío
          // en lugar de causar un error TypeORM inyectando la cadena literal "me".
          query.andWhere('1 = 0');
        }
      } else {
        query.andWhere('signal.personId = :creatorId', { creatorId });
      }
    }

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
      query
        .addSelect((subQuery) => {
          return subQuery
            .select('COUNT(support.id)', 'count')
            .from(ChurchNeedSignalSupport, 'support')
            .where('support.churchNeedSignalId = signal.id');
        }, 'supports_count')
        .orderBy('supports_count', 'DESC');
    } else {
      query.orderBy('signal.createdAt', 'DESC');
    }

    query.skip((page - 1) * limit);
    query.take(limit);

    const [items, total] = await query.getManyAndCount();

    const supportedSignalIds = new Set<string>();
    const signalIdsWithThirdPartyInfo = new Set<string>();

    if (items.length > 0) {
      const signalIds = items.map((i) => i.id);

      if (personId) {
        const supports = await this.supportRepo.find({
          where: {
            personId,
            churchNeedSignalId: In(signalIds),
          },
        });
        supports.forEach((s) => supportedSignalIds.add(s.churchNeedSignalId));
      }

      // We need to know if the creator can delete it (hasThirdPartyInfo)
      // Actually, list doesn't strictly need hasThirdPartyInfo because HATEOAS handles DELETE mostly on detail,
      // but if the list shows actions, we should provide it.
      // To avoid massive queries, maybe we only query it if personId matches creatorId.
      const myCreatedSignalIds = items
        .filter((i) => i.personId === personId)
        .map((i) => i.id);

      if (myCreatedSignalIds.length > 0) {
        const infos = await this.infoRepo
          .createQueryBuilder('info')
          .select('info.entityId')
          .where('info.entityType = :entityType', {
            entityType: NeedInformationEntityType.CHURCH_NEED_SIGNAL,
          })
          .andWhere('info.entityId IN (:...ids)', { ids: myCreatedSignalIds })
          .andWhere('info.personId != :personId', { personId })
          .getRawMany();

        infos.forEach((i) => signalIdsWithThirdPartyInfo.add(i.info_entityId));
      }
    }

    const enhancedItems = items.map((item) => {
      (item as any).hasSupported = supportedSignalIds.has(item.id);
      (item as any).hasThirdPartyInfo = signalIdsWithThirdPartyInfo.has(
        item.id,
      );
      return item;
    });

    return {
      items: enhancedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSignalDetail(signalId: string, personId?: string) {
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

    let hasSupported = false;
    let hasThirdPartyInfo = false;

    if (personId) {
      const support = await this.supportRepo.findOne({
        where: { churchNeedSignalId: signalId, personId },
      });
      hasSupported = !!support;
    }

    const thirdPartyInfoCount = await this.infoRepo
      .createQueryBuilder('info')
      .where('info.entityType = :entityType', {
        entityType: NeedInformationEntityType.CHURCH_NEED_SIGNAL,
      })
      .andWhere('info.entityId = :signalId', { signalId })
      .andWhere('info.personId != :creatorId', { creatorId: signal.personId })
      .getCount();

    hasThirdPartyInfo = thirdPartyInfoCount > 0;

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
      hasSupported,
      hasThirdPartyInfo,
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
          entityId: signal.id,
          entityType: EcosystemActivityEntityType.CHURCH_NEED_SIGNAL,
          country: signal.needLocation.country,
          state: signal.needLocation.state,
          city: signal.needLocation.city,
          metadata: {
            signalId: signal.id,
            infoId: info.id,
            category: dto.category,
            title: dto.title ?? null,
            contentSnippet: dto.content ? dto.content.substring(0, 150) : null,
          },
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

  async mapMarkers(
    viewport: MapViewportDto,
  ): Promise<MapLayerResponseDto<ChurchNeedSignalMapMarkerDto>> {
    // Zoom limit: Continental overview might not show regional needs
    if (viewport.zoom !== undefined && viewport.zoom < 5) {
      return new MapLayerResponseDto([], false);
    }

    const qb = this.signalRepo
      .createQueryBuilder('signal')
      .innerJoin('signal.needLocation', 'location')
      .leftJoin('signal.supports', 'support')
      .where('signal.status = :status', { status: NeedSignalStatus.OPEN })
      .select([
        'signal.id AS id',
        'location.latitude AS "latitude"',
        'location.longitude AS "longitude"',
        'location.city AS city',
        'location.state AS state',
        'location.country AS country',
        'COUNT(support.id) AS "supportCount"',
      ])
      .groupBy('signal.id')
      .addGroupBy('location.latitude')
      .addGroupBy('location.longitude')
      .addGroupBy('location.city')
      .addGroupBy('location.state')
      .addGroupBy('location.country');

    MapFilterUtil.applyViewportFilter(
      qb,
      viewport,
      'location.latitude',
      'location.longitude',
    );

    return MapFilterUtil.getPaginatedRawMapResults(qb, 200, (row) => ({
      id: row.id,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      city: row.city,
      state: row.state,
      country: row.country,
      supportCount: Number(row.supportcount || row.supportCount || 0),
    }));
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
