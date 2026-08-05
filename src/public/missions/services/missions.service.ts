import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MissionProject } from '../entities/mission-project.entity';
import { CreateMissionProjectDto } from '../dto/create-mission-project.dto';
import { UpdateMissionProjectDto } from '../dto/update-mission-project.dto';
import { CompleteMissionDto } from '../dto/complete-mission.dto';
import { Person } from 'src/core/users/entities/person.entity';
import { Church } from 'src/core/churches/entities/church.entity';

import { EcosystemActivitiesService } from '../../ecosystem/services/ecosystem-activities.service';
import {
  EcosystemActivityType,
  EcosystemActivityEntityType,
} from '../../ecosystem/enums/ecosystem.enums';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChurchPublicProfile } from '../../church/entities/church_public_profile.entity';
import { In } from 'typeorm';
import { MissionsPolicies } from '../policies/missions.policies';
import {
  MissionOutcomeType,
  MissionProjectStatus,
  MissionSourceType,
  MissionCollaborationStatus,
} from '../enums/missions.enums';


@Injectable()
export class MissionsService {
  constructor(
    @InjectRepository(MissionProject)
    private readonly missionsRepo: Repository<MissionProject>,
    @InjectRepository(Church)
    private readonly churchRepo: Repository<Church>,

    @InjectRepository(ChurchPublicProfile)
    private readonly churchProfileRepo: Repository<ChurchPublicProfile>,
    private readonly policies: MissionsPolicies,
    private readonly activitiesService: EcosystemActivitiesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    dto: CreateMissionProjectDto,
    actor: Person,
    isChurchAdmin?: boolean,
  ): Promise<MissionProject> {
    if (!(await this.policies.canCreateMission(actor, dto.creatorChurchId))) {
      throw new ForbiddenException(
        'No tienes permiso para crear misiones en esta iglesia',
      );
    }

    const mission = this.missionsRepo.create({
      ...dto,
      status: dto.status || MissionProjectStatus.DRAFT,
    });

    const savedMission = await this.missionsRepo.save(mission);

    if (savedMission.status === MissionProjectStatus.ACTIVE) {
      await this.activitiesService.logActivity({
        actorPersonId: actor.id,
        activityType: EcosystemActivityType.MISSION_CREATED,
        entityId: savedMission.id,
        entityType: EcosystemActivityEntityType.MISSION_PROJECT,
        relatedChurchId: savedMission.creatorChurchId,
        metadata: {
          missionTitle: savedMission.title,
          missionSummary: savedMission.summary,
        },
      });
    }

    return savedMission;
  }

  async findAllActive(page: number = 1, limit: number = 12) {
    const [data, total] = await this.missionsRepo.findAndCount({
      where: { status: MissionProjectStatus.ACTIVE },
      relations: ['creatorChurch', 'leader'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { data, total, page, limit };
  }

  async findAllByChurch(churchId: string, page: number = 1, limit: number = 12) {
    const [data, total] = await this.missionsRepo.findAndCount({
      where: { creatorChurchId: churchId },
      relations: ['creatorChurch', 'leader'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<MissionProject> {
    const mission = await this.missionsRepo.findOne({
      where: { id },
      relations: [
        'creatorChurch',
        'leader',
        'needs',
        'collaborations',
        'reports',
      ],
    });

    if (!mission) throw new NotFoundException('MissionProject no encontrado');
    return mission;
  }

  async update(
    id: string,
    dto: UpdateMissionProjectDto,
    actor: Person,
    isChurchAdmin?: boolean,
  ): Promise<MissionProject> {
    const mission = await this.findOne(id);

    if (
      !(await this.policies.canManageMission(actor, mission, isChurchAdmin))
    ) {
      throw new ForbiddenException(
        'No tienes permiso para gestionar esta misión',
      );
    }

    const wasDraft = mission.status === MissionProjectStatus.DRAFT;
    const previousStatus = mission.status;
    
    this.missionsRepo.merge(mission, dto);
    const savedMission = await this.missionsRepo.save(mission);

    if (wasDraft && savedMission.status === MissionProjectStatus.ACTIVE) {
      await this.activitiesService.logActivity({
        actorPersonId: actor.id,
        activityType: EcosystemActivityType.MISSION_CREATED,
        entityId: savedMission.id,
        entityType: EcosystemActivityEntityType.MISSION_PROJECT,
        relatedChurchId: savedMission.creatorChurchId,
        metadata: {
          missionTitle: savedMission.title,
          missionSummary: savedMission.summary,
        },
      });
    } else if (previousStatus === MissionProjectStatus.ACTIVE && savedMission.status === MissionProjectStatus.PAUSED) {
      await this.activitiesService.logActivity({
        actorPersonId: actor.id,
        activityType: EcosystemActivityType.MISSION_PAUSED,
        entityId: savedMission.id,
        entityType: EcosystemActivityEntityType.MISSION_PROJECT,
        relatedChurchId: savedMission.creatorChurchId,
        metadata: {
          missionTitle: savedMission.title,
        },
      });
    } else if (previousStatus === MissionProjectStatus.PAUSED && savedMission.status === MissionProjectStatus.ACTIVE) {
      await this.activitiesService.logActivity({
        actorPersonId: actor.id,
        activityType: EcosystemActivityType.MISSION_RESUMED,
        entityId: savedMission.id,
        entityType: EcosystemActivityEntityType.MISSION_PROJECT,
        relatedChurchId: savedMission.creatorChurchId,
        metadata: {
          missionTitle: savedMission.title,
        },
      });
    }

    return savedMission;
  }

  async completeMission(
    id: string,
    dto: CompleteMissionDto,
    actor: Person,
    isChurchAdmin?: boolean,
  ): Promise<MissionProject> {
    const mission = await this.findOne(id);

    if (
      !(await this.policies.canCompleteMission(actor, mission, isChurchAdmin))
    ) {
      throw new ForbiddenException(
        'No tienes permiso para completar esta misión',
      );
    }

    return this.missionsRepo.manager.transaction(async (manager) => {
      mission.status = MissionProjectStatus.COMPLETED;
      mission.outcomeType = dto.outcomeType;
      mission.completedAt = new Date();

      if (dto.resultingChurchId) {
        mission.resultingChurchId = dto.resultingChurchId;
        await manager.update(
          Church,
          { id: dto.resultingChurchId },
          { originMissionId: mission.id },
        );
      }

      const saved = await manager.save(MissionProject, mission);

      if (
        saved.sourceEntityType === MissionSourceType.CHURCH_NEED_SIGNAL &&
        saved.sourceEntityId
      ) {
        if (dto.resultingChurchId) {
          this.eventEmitter.emit('church.need.signal.resolved', {
            needSignalId: saved.sourceEntityId,
            resultingChurchId: dto.resultingChurchId,
            missionId: saved.id,
          });
        }
      }

      await this.activitiesService.logActivity(
        {
          actorPersonId: actor.id,
          activityType: EcosystemActivityType.MISSION_COMPLETED,
          entityId: saved.id,
          entityType: EcosystemActivityEntityType.MISSION_PROJECT,
          relatedChurchId: saved.creatorChurchId,
          metadata: {
            missionTitle: saved.title,
            outcomeType: saved.outcomeType,
          },
        },
        manager,
      );

      return saved;
    });
  }

  async cancelMission(
    id: string,
    actor: Person,
    isChurchAdmin?: boolean,
  ): Promise<MissionProject> {
    const mission = await this.findOne(id);

    if (
      !(await this.policies.canManageMission(actor, mission, isChurchAdmin))
    ) {
      throw new ForbiddenException(
        'No tienes permiso para gestionar esta misión',
      );
    }

    mission.status = MissionProjectStatus.CANCELLED;
    const saved = await this.missionsRepo.save(mission);

    await this.activitiesService.logActivity({
      actorPersonId: actor.id,
      activityType: EcosystemActivityType.MISSION_CANCELLED,
      entityId: saved.id,
      entityType: EcosystemActivityEntityType.MISSION_PROJECT,
      relatedChurchId: saved.creatorChurchId,
      metadata: {
        missionTitle: saved.title,
      },
    });

    const activeCollabs =
      mission.collaborations?.filter(
        (c) => c.status !== MissionCollaborationStatus.WITHDRAWN,
      ) || [];
    const churchIds = activeCollabs.map((c) => c.churchId);
    let recipientPersonIds: string[] = [];

    if (churchIds.length > 0) {
      const profiles = await this.churchProfileRepo.find({
        where: { churchId: In(churchIds) },
      });
      recipientPersonIds = profiles
        .map((p) => p.claimerPersonId || p.creatorPersonId)
        .filter((id) => !!id);
    }

    if (recipientPersonIds.length > 0) {
      this.eventEmitter.emit('mission.cancelled', {
        recipientPersonIds,
        missionName: mission.title,
        creatorChurchId: mission.creatorChurchId,
      });
    }

    return saved;
  }

  async mapSummary(id: string) {
    const mission = await this.missionsRepo.findOne({ where: { id } });
    if (!mission) return null;
    return {
      id: mission.id,
      title: mission.title,
      type: 'MISSION',
      description: mission.description?.slice(0, 150) ?? null,
      city: mission.city,
      state: mission.state,
      country: mission.country,
      latitude: mission.latitude,
      longitude: mission.longitude,
      geoPrecision: mission.geoPrecision,
      ctaLink: `/missions/${mission.id}`,
    };
  }
}
