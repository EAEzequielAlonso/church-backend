import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnreachedArea } from '../entities/unreached-area.entity';
import { NeedLocation } from '../entities/need-location.entity';
import { NeedInformation } from '../entities/need-information.entity';
import { EcosystemContributionsService } from '../../ecosystem/services/ecosystem-contributions.service';
import { EcosystemActivitiesService } from '../../ecosystem/services/ecosystem-activities.service';
import { GeoService } from '../../ecosystem/geo/geo.service';
import { GeoNormalizationUtil } from '../../ecosystem/geo/utils/geo-normalization.util';
import {
  EcosystemContributionType,
  EcosystemActivityType,
  EcosystemActivityEntityType,
} from '../../ecosystem/enums/ecosystem.enums';
import {
  NeedInformationEntityType,
  UnreachedAreaStatus,
} from '../enums/need-signals.enum';
import { CreateUnreachedAreaDto } from '../dto/unreached-areas/create-unreached-area.dto';
import { UpdateUnreachedAreaDto } from '../dto/unreached-areas/update-unreached-area.dto';
import { UnreachedAreaFilterDto } from '../dto/unreached-areas/unreached-area-filter.dto';
import { UnreachedAreaMapMarkerDto } from '../dto/unreached-areas/unreached-area-map-marker.dto';
import { UpdateUnreachedAreaStatusDto } from '../dto/unreached-areas/update-unreached-area-status.dto';
import { AddNeedInformationDto } from '../dto/church-need-signals/add-need-information.dto';
import { InformationFilterDto } from '../dto/church-need-signals/information-filter.dto';
import { MapViewportDto } from 'src/shared/dtos/map-viewport.dto';
import { MapLayerResponseDto } from 'src/shared/dtos/map-layer-response.dto';
import { MapFilterUtil } from 'src/shared/utils/map-filter.util';

@Injectable()
export class UnreachedAreasService {
  constructor(
    @InjectRepository(UnreachedArea)
    private readonly unreachedAreaRepository: Repository<UnreachedArea>,
    @InjectRepository(NeedLocation)
    private readonly needLocationRepository: Repository<NeedLocation>,
    @InjectRepository(NeedInformation)
    private readonly needInformationRepository: Repository<NeedInformation>,
    private readonly ecosystemContributionsService: EcosystemContributionsService,
    private readonly activitiesService: EcosystemActivitiesService,
    private readonly geoService: GeoService,
  ) {}

  async mapMarkers(
    viewport: MapViewportDto,
  ): Promise<MapLayerResponseDto<UnreachedAreaMapMarkerDto>> {
    // Zoom limit: Continental overview might not show local areas
    if (viewport.zoom !== undefined && viewport.zoom < 5) {
      return new MapLayerResponseDto([], false);
    }

    const qb = this.unreachedAreaRepository
      .createQueryBuilder('area')
      .innerJoin('area.needLocation', 'location')
      .where('area.status = :status', { status: UnreachedAreaStatus.OPEN })
      .select([
        'area.id AS id',
        'area.title AS title',
        'location.latitude AS "latitude"',
        'location.longitude AS "longitude"',
        'location.city AS city',
        'location.state AS state',
        'location.country AS country',
      ]);

    MapFilterUtil.applyViewportFilter(
      qb,
      viewport,
      'location.latitude',
      'location.longitude',
    );

    return MapFilterUtil.getPaginatedRawMapResults(qb, 200, (row) => ({
      id: row.id,
      title: row.title,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      city: row.city,
      state: row.state,
      country: row.country,
    }));
  }

  async create(
    personId: string,
    dto: CreateUnreachedAreaDto,
  ): Promise<UnreachedArea> {
    const nCountry = GeoNormalizationUtil.normalizeString(dto.country);
    const nState = GeoNormalizationUtil.normalizeString(dto.state);
    const nCity = GeoNormalizationUtil.normalizeString(dto.city);

    let needLocation = await this.needLocationRepository.findOne({
      where: {
        country: nCountry,
        state: nState,
        city: nCity,
      },
    });

    if (!needLocation) {
      try {
        const geoResult = await this.geoService.geocodeChurchAddress({
          country: nCountry,
          state: nState,
          city: nCity,
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
        throw new BadRequestException(
          'No pudimos localizar geográficamente tu ciudad. Por favor intenta más tarde o revisa los datos.',
        );
      }
    }

    const unreachedArea = this.unreachedAreaRepository.create({
      reporterPersonId: personId,
      needLocationId: needLocation.id,
      title: dto.title,
      description: dto.description,
      population: dto.population,
      language: dto.language,
      ethnicity: dto.ethnicity,
      religion: dto.religion,
      bibleAvailable: dto.bibleAvailable,
      churchKnown: dto.churchKnown,
      hostileEnvironment: dto.hostileEnvironment,
      governmentRestrictions: dto.governmentRestrictions,
      difficultAccess: dto.difficultAccess,
      missionaryNotes: dto.missionaryNotes,
      status: UnreachedAreaStatus.OPEN,
    });

    const savedArea = await this.unreachedAreaRepository.save(unreachedArea);

    await this.ecosystemContributionsService.recordContribution({
      actorPersonId: personId,
      targetChurchId: null,
      type: EcosystemContributionType.UNREACHED_AREA_CREATED,
      metadata: {
        unreachedAreaId: savedArea.id,
        geoCity: needLocation.city,
        geoState: needLocation.state,
        geoCountry: needLocation.country,
      },
    });

    await this.activitiesService.logActivity({
      actorPersonId: personId,
      activityType: EcosystemActivityType.UNREACHED_AREA_CREATED,
      entityId: savedArea.id,
      entityType: EcosystemActivityEntityType.UNREACHED_AREA,
      country: needLocation.country,
      state: needLocation.state,
      city: needLocation.city,
    });

    return savedArea;
  }

  async findAll(filterDto: UnreachedAreaFilterDto) {
    const { country, state, city, status, page = 1, limit = 20 } = filterDto;

    const query = this.unreachedAreaRepository
      .createQueryBuilder('area')
      .leftJoinAndSelect('area.needLocation', 'location')
      .leftJoinAndSelect('area.reporterPerson', 'person');

    if (country) {
      query.andWhere('location.country = :country', {
        country: GeoNormalizationUtil.normalizeString(country),
      });
    }
    if (state) {
      query.andWhere('location.state = :state', {
        state: GeoNormalizationUtil.normalizeString(state),
      });
    }
    if (city) {
      query.andWhere('location.city = :city', {
        city: GeoNormalizationUtil.normalizeString(city),
      });
    }
    if (status) {
      query.andWhere('area.status = :status', { status });
    }

    query.orderBy('area.createdAt', 'DESC');
    query.skip((page - 1) * limit);
    query.take(limit);

    const [items, total] = await query.getManyAndCount();

    return {
      items: items.map((item) => ({
        ...item,
        reporterPerson: item.reporterPerson
          ? {
              id: item.reporterPerson.id,
              firstName: item.reporterPerson.firstName,
              lastName: item.reporterPerson.lastName,
              avatarUrl: item.reporterPerson.avatarUrl,
              slug: item.reporterPerson.slug,
            }
          : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<UnreachedArea> {
    const area = await this.unreachedAreaRepository.findOne({
      where: { id },
      relations: ['needLocation', 'reporterPerson'],
    });

    if (!area) {
      throw new NotFoundException('Unreached Area no encontrada');
    }

    return {
      ...area,
      reporterPerson: area.reporterPerson
        ? ({
            id: area.reporterPerson.id,
            firstName: area.reporterPerson.firstName,
            lastName: area.reporterPerson.lastName,
            avatarUrl: area.reporterPerson.avatarUrl,
            slug: area.reporterPerson.slug,
          } as any)
        : null,
    };
  }

  async update(
    id: string,
    personId: string,
    dto: UpdateUnreachedAreaDto,
  ): Promise<UnreachedArea> {
    const area = await this.unreachedAreaRepository.findOne({
      where: { id, reporterPersonId: personId },
    });

    if (!area) {
      throw new NotFoundException(
        'Unreached Area no encontrada o no tienes permisos para editarla',
      );
    }

    Object.assign(area, dto);
    return this.unreachedAreaRepository.save(area);
  }

  async updateStatus(
    id: string,
    personId: string,
    dto: UpdateUnreachedAreaStatusDto,
  ): Promise<UnreachedArea> {
    const area = await this.unreachedAreaRepository.findOne({
      where: { id, reporterPersonId: personId },
      relations: ['needLocation'],
    });

    if (!area) {
      throw new NotFoundException(
        'Unreached Area no encontrada o no tienes permisos para editarla',
      );
    }

    area.status = dto.status;
    const savedArea = await this.unreachedAreaRepository.save(area);

    if (dto.status === UnreachedAreaStatus.REACHED) {
      await this.activitiesService.logActivity({
        actorPersonId: personId,
        activityType: EcosystemActivityType.UNREACHED_AREA_REACHED,
        entityId: savedArea.id,
        entityType: EcosystemActivityEntityType.UNREACHED_AREA,
        country: area.needLocation?.country,
        state: area.needLocation?.state,
        city: area.needLocation?.city,
      });
    }

    return savedArea;
  }

  async updateAsAdmin(
    id: string,
    dto: UpdateUnreachedAreaDto,
  ): Promise<UnreachedArea> {
    const area = await this.unreachedAreaRepository.findOne({ where: { id } });

    if (!area) {
      throw new NotFoundException('Unreached Area no encontrada');
    }

    Object.assign(area, dto);
    return this.unreachedAreaRepository.save(area);
  }

  async updateStatusAsAdmin(
    id: string,
    adminPersonId: string,
    dto: UpdateUnreachedAreaStatusDto,
  ): Promise<UnreachedArea> {
    const area = await this.unreachedAreaRepository.findOne({
      where: { id },
      relations: ['needLocation'],
    });

    if (!area) {
      throw new NotFoundException('Unreached Area no encontrada');
    }

    area.status = dto.status;
    const savedArea = await this.unreachedAreaRepository.save(area);

    if (dto.status === UnreachedAreaStatus.REACHED) {
      await this.activitiesService.logActivity({
        actorPersonId: adminPersonId,
        activityType: EcosystemActivityType.UNREACHED_AREA_REACHED,
        entityId: savedArea.id,
        entityType: EcosystemActivityEntityType.UNREACHED_AREA,
        country: area.needLocation?.country,
        state: area.needLocation?.state,
        city: area.needLocation?.city,
      });
    }

    return savedArea;
  }

  async addInformation(
    personId: string,
    areaId: string,
    dto: AddNeedInformationDto,
  ) {
    const area = await this.unreachedAreaRepository.findOne({
      where: { id: areaId },
      relations: ['needLocation'],
    });

    if (!area) {
      throw new NotFoundException('Unreached Area no encontrada');
    }

    const info = this.needInformationRepository.create({
      personId,
      entityType: NeedInformationEntityType.UNREACHED_AREA,
      entityId: areaId,
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
        unreachedAreaId: areaId,
        infoId: savedInfo.id,
        geoCity: area.needLocation?.city,
        geoState: area.needLocation?.state,
        geoCountry: area.needLocation?.country,
      },
    });

    await this.activitiesService.logActivity({
      actorPersonId: personId,
      activityType: EcosystemActivityType.NEED_INFORMATION_ADDED,
      entityId: areaId,
      entityType: EcosystemActivityEntityType.UNREACHED_AREA,
      country: area.needLocation?.country,
      state: area.needLocation?.state,
      city: area.needLocation?.city,
      metadata: {
        unreachedAreaId: area.id,
        infoId: savedInfo.id,
        category: dto.category,
        title: dto.title ?? null,
        contentSnippet: dto.content ? dto.content.substring(0, 150) : null,
        areaTitle: area.title,
      },
    });

    return savedInfo;
  }

  async listInformation(areaId: string, filterDto: InformationFilterDto) {
    const { category, page = 1, limit = 10 } = filterDto;

    const query = this.needInformationRepository
      .createQueryBuilder('info')
      .leftJoinAndSelect('info.person', 'person')
      .where('info.entityType = :entityType', {
        entityType: NeedInformationEntityType.UNREACHED_AREA,
      })
      .andWhere('info.entityId = :areaId', { areaId });

    if (category) {
      query.andWhere('info.category = :category', { category });
    }

    query.orderBy('info.createdAt', 'DESC');
    query.skip((page - 1) * limit);
    query.take(limit);

    const [items, total] = await query.getManyAndCount();

    return {
      items: items.map((item) => ({
        ...item,
        person: item.person
          ? {
              id: item.person.id,
              firstName: item.person.firstName,
              lastName: item.person.lastName,
              avatarUrl: item.person.avatarUrl,
              slug: item.person.slug,
            }
          : null,
      })),
      total,
      totalPages: Math.ceil(total / limit),
      page,
      limit,
    };
  }

  async mapSummary(id: string) {
    const area = await this.unreachedAreaRepository.findOne({
      where: { id },
      relations: ['needLocation'],
    });
    if (!area) return null;
    return {
      id: area.id,
      title: area.title,
      type: 'UNREACHED_AREA',
      description: area.description?.slice(0, 150) ?? null,
      city: area.needLocation?.city,
      state: area.needLocation?.state,
      ctaLink: `/network/unreached/${area.id}`,
    };
  }
}
