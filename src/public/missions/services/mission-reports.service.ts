import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MissionReport } from '../entities/mission-report.entity';
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

@Injectable()
export class MissionReportsService {
  constructor(
    @InjectRepository(MissionReport)
    private readonly reportsRepo: Repository<MissionReport>,
    private readonly missionRules: MissionRules,
    private readonly missionsService: MissionsService,
    private readonly activitiesService: EcosystemActivitiesService,
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
      relations: ['author'],
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
      relations: ['author'],
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
        entityType: EcosystemActivityEntityType.MISSION_PROJECT,
        relatedChurchId: mission.creatorChurchId,
        metadata: {
          missionProjectId: mission.id,
          missionTitle: mission.title,
          reportTitle: saved.title,
          reportCategory: saved.category,
          coverImage: saved.attachments?.length ? saved.attachments[0] : null,
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
    });
    if (!report) throw new NotFoundException('Reporte no encontrado');

    const wasPublic = report.isPublic;

    this.reportsRepo.merge(report, dto);
    const saved = await this.reportsRepo.save(report);

    // TODO: Si el reporte pasa a isPublic=true y antes era false, deberíamos emitir evento.
    // Por simplicidad en la fase actual, asumiremos que editar un reporte no re-emite al ecosistema a menos que sea algo mayor,
    // pero como el feed reacciona a MISSION_UPDATE_POSTED, no queremos duplicar spam.
    if (wasPublic && !saved.isPublic) {
      await this.activitiesService.deleteActivitiesByEntity(
        EcosystemActivityEntityType.MISSION_PROJECT,
        saved.id,
      );
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
    });
    if (!report) throw new NotFoundException('Reporte no encontrado');

    if (report.isPublic) {
      await this.activitiesService.deleteActivitiesByEntity(
        EcosystemActivityEntityType.MISSION_PROJECT,
        report.id,
      );
    }

    await this.reportsRepo.remove(report);
  }
}
