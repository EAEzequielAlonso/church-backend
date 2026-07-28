import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MissionReport } from '../entities/mission-report.entity';
import { CreateMissionReportDto } from '../dto/create-mission-report.dto';
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
      });
    }

    return saved;
  }
}
