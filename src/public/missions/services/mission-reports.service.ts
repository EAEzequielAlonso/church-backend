import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MissionReport } from '../entities/mission-report.entity';
import { CreateMissionReportDto } from '../dto/create-mission-report.dto';
import { UpdateMissionReportDto } from '../dto/update-mission-report.dto';
import { Person } from 'src/core/users/entities/person.entity';
import { MissionsPolicies } from '../policies/missions.policies';
import { MissionsService } from './missions.service';
import { EcosystemActivitiesService } from '../../ecosystem/services/ecosystem-activities.service';
import {
  EcosystemActivityType,
  EcosystemActivityEntityType,
} from '../../ecosystem/enums/ecosystem.enums';

@Injectable()
export class MissionReportsService {
  constructor(
    @InjectRepository(MissionReport)
    private readonly reportsRepo: Repository<MissionReport>,
    private readonly policies: MissionsPolicies,
    private readonly missionsService: MissionsService,
    private readonly activitiesService: EcosystemActivitiesService,
  ) {}

  async create(
    missionId: string,
    dto: CreateMissionReportDto,
    actor: Person,
    isChurchAdmin?: boolean,
  ): Promise<MissionReport> {
    const mission = await this.missionsService.findOne(missionId);

    if (!(await this.policies.canCreateReport(actor, mission, isChurchAdmin))) {
      throw new ForbiddenException(
        'No tienes permiso para crear reportes en esta misión',
      );
    }

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

    if (!(await this.policies.canManageMission(actor, mission, isChurchAdmin))) {
      throw new ForbiddenException(
        'No tienes permiso para editar reportes en esta misión',
      );
    }

    const report = await this.reportsRepo.findOne({ where: { id: reportId, missionProjectId: missionId } });
    if (!report) throw new NotFoundException('Reporte no encontrado');

    this.reportsRepo.merge(report, dto);
    const saved = await this.reportsRepo.save(report);

    // TODO: Si el reporte pasa a isPublic=true y antes era false, deberíamos emitir evento.
    // Por simplicidad en la fase actual, asumiremos que editar un reporte no re-emite al ecosistema a menos que sea algo mayor,
    // pero como el feed reacciona a MISSION_UPDATE_POSTED, no queremos duplicar spam.

    return saved;
  }

  async remove(
    missionId: string,
    reportId: string,
    actor: Person,
    isChurchAdmin?: boolean,
  ): Promise<void> {
    const mission = await this.missionsService.findOne(missionId);

    if (!(await this.policies.canManageMission(actor, mission, isChurchAdmin))) {
      throw new ForbiddenException(
        'No tienes permiso para eliminar reportes en esta misión',
      );
    }

    const report = await this.reportsRepo.findOne({ where: { id: reportId, missionProjectId: missionId } });
    if (!report) throw new NotFoundException('Reporte no encontrado');

    await this.reportsRepo.remove(report);
  }
}
