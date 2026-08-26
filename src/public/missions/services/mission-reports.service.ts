import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MissionReport } from '../entities/mission-report.entity';
import { MissionReportMedia } from '../entities/mission-report-media.entity';
import { CreateMissionReportDto } from '../dto/create-mission-report.dto';
import { UpdateMissionReportDto } from '../dto/update-mission-report.dto';
import { Person } from 'src/core/users/entities/person.entity';
import { MissionRules } from '../policies/mission.rules';
import { MissionsService } from './missions.service';
import { EcosystemActivitiesService } from '../../ecosystem/services/ecosystem-activities.service';
import {
  EcosystemActivityType,
  EcosystemActivityEntityType,
} from '../../ecosystem/enums/ecosystem.enums';

import { PaginatedResponseDto } from 'src/shared/dtos/paginated-response.dto';
import { MissionReportQueryDto } from '../dto/mission-report-query.dto';
import { MissionReportProductDto } from '../dto/mission-report-product.dto';
import { StorageService } from '../../../core/storage/storage.service';

@Injectable()
export class MissionReportsService {
  private readonly logger = new Logger(MissionReportsService.name);
  constructor(
    @InjectRepository(MissionReport)
    private readonly reportsRepo: Repository<MissionReport>,
    private readonly missionRules: MissionRules,
    private readonly missionsService: MissionsService,
    private readonly activitiesService: EcosystemActivitiesService,
    private readonly storageService: StorageService,
  ) {}

  async findPublicReports(
    missionId: string,
    query: MissionReportQueryDto,
    actor?: Person,
  ): Promise<PaginatedResponseDto<MissionReportProductDto>> {
    const {
      page = 1,
      limit = 12,
      sort = 'createdAt',
      order = 'DESC',
      category,
    } = query;

    const where: any = { missionProjectId: missionId, isPublic: true };
    if (category) where.category = category;

    // Si hubiese implementado search, se usaría ILike o similar aquí. Queda preparado el contrato.

    const [data, total] = await this.reportsRepo.findAndCount({
      where,
      relations: ['author', 'media'],
      skip: (page - 1) * limit,
      take: limit,
      order: { [sort]: order },
    });

    const mission = await this.missionsService.findOne(missionId);
    let isManager = false;
    if (actor) {
      try {
        await this.missionRules.assertCanManage(actor, mission);
        isManager = true;
      } catch {
        isManager = false;
      }
    }

    const dtos = data.map((report) => {
      const actions = this.missionRules.getReportAllowedActions(
        actor?.id,
        mission,
        report,
        isManager,
      );
      return MissionReportProductDto.fromEntity(report, actions);
    });

    return new PaginatedResponseDto(dtos, total, page, limit);
  }

  async findManagementReports(
    missionId: string,
    query: MissionReportQueryDto,
    actor: Person,
    isChurchAdmin?: boolean,
  ): Promise<PaginatedResponseDto<MissionReportProductDto>> {
    const mission = await this.missionsService.findOne(missionId);

    // Solo un admin de la misión puede listar los reportes privados
    await this.missionRules.assertCanManage(actor, mission, isChurchAdmin);

    const {
      page = 1,
      limit = 12,
      sort = 'createdAt',
      order = 'DESC',
      category,
    } = query;

    const where: any = { missionProjectId: missionId };
    if (category) where.category = category;

    const [data, total] = await this.reportsRepo.findAndCount({
      where,
      relations: ['author', 'media'],
      skip: (page - 1) * limit,
      take: limit,
      order: { [sort]: order },
    });

    const dtos = data.map((report) => {
      const actions = this.missionRules.getReportAllowedActions(
        actor.id,
        mission,
        report,
        true,
      );
      return MissionReportProductDto.fromEntity(report, actions);
    });

    return new PaginatedResponseDto(dtos, total, page, limit);
  }

  async create(
    missionId: string,
    dto: CreateMissionReportDto,
    actor: Person,
    isChurchAdmin?: boolean,
  ): Promise<MissionReport> {
    const mission = await this.missionsService.findOne(missionId);

    await this.missionRules.assertCanManage(actor, mission, isChurchAdmin);
    this.missionRules.assertCanAddReport(mission);

    const report = this.reportsRepo.create({
      ...dto,
      missionProjectId: missionId,
      authorPersonId: actor.id,
    });

    const saved = await this.reportsRepo.save(report);

    if (saved.isPublic) {
      await this.activitiesService.logActivity({
        actorPersonId: actor.id,
        activityType: EcosystemActivityType.MISSION_UPDATE_POSTED,
        entityId: saved.id,
        entityType: EcosystemActivityEntityType.MISSION_REPORT,
        relatedChurchId: mission.creatorChurchId,
        metadata: {
          missionProjectId: mission.id,
          missionTitle: mission.title,
          reportTitle: saved.title,
          reportCategory: saved.category,
          coverImage: saved.media?.length ? saved.media[0].url : null,
          excerpt: saved.content?.substring(0, 150) || null,
        },
      });
    }

    return saved;
  }

  async update(
    missionId: string,
    reportId: string,
    dto: UpdateMissionReportDto,
    actor: Person,
    isChurchAdmin?: boolean,
  ): Promise<MissionReport> {
    const mission = await this.missionsService.findOne(missionId);

    await this.missionRules.assertCanManage(actor, mission, isChurchAdmin);
    this.missionRules.assertCanEdit(mission);

    const report = await this.reportsRepo.findOne({
      where: { id: reportId, missionProjectId: missionId },
      relations: ['media'],
    });
    if (!report) throw new NotFoundException('Reporte no encontrado');

    const wasPublic = report.isPublic;

    // Identificar media removida para limpieza posterior en R2
    const existingMediaUrls = report.media?.map((m) => m.url) || [];
    const newMediaUrls = dto.media?.map((m) => m.url) || [];
    const removedUrls = existingMediaUrls.filter((url) => !newMediaUrls.includes(url));

    if (dto.media) {
      const mediaRepo = this.reportsRepo.manager.getRepository(MissionReportMedia);
      const existingMedia = report.media || [];

      // Eliminamos explícitamente las removidas para evitar el null constraint
      const mediaToDelete = existingMedia.filter((m) => !newMediaUrls.includes(m.url));
      if (mediaToDelete.length > 0) {
        await mediaRepo.remove(mediaToDelete);
      }

      report.media = dto.media.map((itemDto) => {
        const existingItem = existingMedia.find((m) => m.url === itemDto.url);
        if (existingItem) {
          return mediaRepo.merge(existingItem, itemDto);
        }
        return mediaRepo.create({
          ...itemDto,
          missionReportId: report.id,
        });
      });
    }
    
    // Eliminamos media del dto para que merge no lo sobreescriba de manera incorrecta
    const { media, ...restDto } = dto;
    this.reportsRepo.merge(report, restDto);
    
    const saved = await this.reportsRepo.save(report);

    // TODO: Si el reporte pasa a isPublic=true y antes era false, deberíamos emitir evento.
    if (wasPublic && !saved.isPublic) {
      await this.activitiesService.deleteActivitiesByEntity(
        EcosystemActivityEntityType.MISSION_REPORT,
        saved.id,
      );
      // Compatibilidad histórica
      await this.activitiesService.deleteActivitiesByEntity(
        EcosystemActivityEntityType.MISSION_PROJECT,
        saved.id,
      );
    } else if (!wasPublic && saved.isPublic) {
      await this.activitiesService.logActivity({
        actorPersonId: actor.id,
        activityType: EcosystemActivityType.MISSION_UPDATE_POSTED,
        entityId: saved.id,
        entityType: EcosystemActivityEntityType.MISSION_REPORT,
        relatedChurchId: mission.creatorChurchId,
        metadata: {
          missionProjectId: mission.id,
          missionTitle: mission.title,
          reportTitle: saved.title,
          reportCategory: saved.category,
          coverImage: saved.media?.length ? saved.media[0].url : null,
          excerpt: saved.content?.substring(0, 150) || null,
        },
      });
    }

    // Cleanup R2 posterior a PostgreSQL
    for (const url of removedUrls) {
      const key = this.storageService.extractKeyFromUrl(url, 'mission-reports');
      if (key) {
        this.storageService.deleteObject(key).catch((error) => {
          this.logger.error(`Failed to delete removed media ${url} from R2`, error);
        });
      }
    }

    return saved;
  }

  async remove(
    missionId: string,
    reportId: string,
    actor: Person,
    isChurchAdmin?: boolean,
  ): Promise<void> {
    const mission = await this.missionsService.findOne(missionId);

    await this.missionRules.assertCanManage(actor, mission, isChurchAdmin);
    this.missionRules.assertCanEdit(mission);

    const report = await this.reportsRepo.findOne({
      where: { id: reportId, missionProjectId: missionId },
      relations: ['media'],
    });
    if (!report) throw new NotFoundException('Reporte no encontrado');

    const urlsToDelete = report.media?.map((m) => m.url) || [];

    if (report.isPublic) {
      await this.activitiesService.deleteActivitiesByEntity(
        EcosystemActivityEntityType.MISSION_REPORT,
        report.id,
      );
      // Compatibilidad histórica
      await this.activitiesService.deleteActivitiesByEntity(
        EcosystemActivityEntityType.MISSION_PROJECT,
        report.id,
      );
    }

    await this.reportsRepo.remove(report);

    // Cleanup R2 posterior a PostgreSQL
    for (const url of urlsToDelete) {
      const key = this.storageService.extractKeyFromUrl(url, 'mission-reports');
      if (key) {
        this.storageService.deleteObject(key).catch((error) => {
          this.logger.error(`Failed to delete media ${url} from R2 on report removal`, error);
        });
      }
    }
  }
}
