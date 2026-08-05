import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MissionNeed } from '../entities/mission-need.entity';
import { CreateMissionNeedDto } from '../dto/create-mission-need.dto';
import { UpdateMissionNeedDto } from '../dto/update-mission-need.dto';
import { Person } from 'src/core/users/entities/person.entity';
import { MissionsPolicies } from '../policies/missions.policies';
import { MissionsService } from './missions.service';
import { ChurchPublicProfile } from '../../church/entities/church_public_profile.entity';
import { MissionCollaborationStatus, MissionNeedStatus } from '../enums/missions.enums';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { In } from 'typeorm';
import { EcosystemActivitiesService } from '../../ecosystem/services/ecosystem-activities.service';
import {
  EcosystemActivityType,
  EcosystemActivityEntityType,
} from '../../ecosystem/enums/ecosystem.enums';

@Injectable()
export class MissionNeedsService {
  constructor(
    @InjectRepository(MissionNeed)
    private readonly needsRepo: Repository<MissionNeed>,
    @InjectRepository(ChurchPublicProfile)
    private readonly churchProfileRepo: Repository<ChurchPublicProfile>,
    private readonly policies: MissionsPolicies,
    private readonly missionsService: MissionsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly activitiesService: EcosystemActivitiesService,
  ) {}

  async create(
    missionId: string,
    dto: CreateMissionNeedDto,
    actor: Person,
    isChurchAdmin?: boolean,
  ): Promise<MissionNeed> {
    const mission = await this.missionsService.findOne(missionId);

    if (
      !(await this.policies.canManageMission(actor, mission, isChurchAdmin))
    ) {
      throw new ForbiddenException(
        'No tienes permiso para gestionar necesidades en esta misión',
      );
    }

    const need = this.needsRepo.create({
      ...dto,
      missionProjectId: missionId,
      createdByPersonId: actor.id,
    });

    const saved = await this.needsRepo.save(need);

    await this.activitiesService.logActivity({
      actorPersonId: actor.id,
      activityType: EcosystemActivityType.MISSION_NEED_CREATED,
      entityId: saved.id,
      entityType: EcosystemActivityEntityType.MISSION_NEED,
      relatedChurchId: mission.creatorChurchId,
      metadata: {
        missionTitle: mission.title,
        needTitle: saved.title,
        needType: saved.type,
      },
    });

    const activeCollabs =
      mission.collaborations?.filter(
        (c) => c.status === MissionCollaborationStatus.ACTIVE,
      ) || [];
    const churchIds = activeCollabs.map((c) => c.churchId);

    if (churchIds.length > 0) {
      const profiles = await this.churchProfileRepo.find({
        where: { churchId: In(churchIds) },
      });

      const recipientPersonIds = profiles
        .map((p) => p.claimerPersonId || p.creatorPersonId)
        .filter((id) => !!id);

      if (recipientPersonIds.length > 0) {
        this.eventEmitter.emit('mission.need.created', {
          recipientPersonIds,
          missionName: mission.title,
          needType: dto.type,
        });
      }
    }

    return saved;
  }

  async update(
    missionId: string,
    needId: string,
    dto: UpdateMissionNeedDto,
    actor: Person,
    isChurchAdmin?: boolean,
  ): Promise<MissionNeed> {
    const mission = await this.missionsService.findOne(missionId);

    if (
      !(await this.policies.canManageMission(actor, mission, isChurchAdmin))
    ) {
      throw new ForbiddenException(
        'No tienes permiso para gestionar necesidades en esta misión',
      );
    }

    const need = await this.needsRepo.findOne({ where: { id: needId, missionProjectId: missionId } });
    if (!need) throw new NotFoundException('Need no encontrada');

    const previousStatus = need.status;
    this.needsRepo.merge(need, dto);
    const saved = await this.needsRepo.save(need);

    // Si cambió el estado a COMPLETED, emitir evento de Feed
    if (previousStatus !== MissionNeedStatus.COMPLETED && saved.status === MissionNeedStatus.COMPLETED) {
       await this.activitiesService.logActivity({
        actorPersonId: actor.id,
        activityType: EcosystemActivityType.MISSION_NEED_FULFILLED,
        entityId: saved.id,
        entityType: EcosystemActivityEntityType.MISSION_NEED,
        relatedChurchId: mission.creatorChurchId,
        metadata: {
          missionTitle: mission.title,
          needTitle: saved.title,
          needType: saved.type,
        },
      });
    }

    return saved;
  }

  async remove(
    missionId: string,
    needId: string,
    actor: Person,
    isChurchAdmin?: boolean,
  ): Promise<void> {
    const mission = await this.missionsService.findOne(missionId);

    if (
      !(await this.policies.canManageMission(actor, mission, isChurchAdmin))
    ) {
      throw new ForbiddenException(
        'No tienes permiso para gestionar necesidades en esta misión',
      );
    }

    const need = await this.needsRepo.findOne({ where: { id: needId, missionProjectId: missionId } });
    if (!need) throw new NotFoundException('Need no encontrada');

    await this.needsRepo.remove(need);
  }
}
