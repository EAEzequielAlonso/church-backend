import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MissionCollaboration } from '../entities/mission-collaboration.entity';
import { CreateMissionCollaborationDto } from '../dto/create-mission-collaboration.dto';
import { Person } from 'src/core/users/entities/person.entity';
import { MissionsPolicies } from '../policies/missions.policies';
import { MissionsService } from './missions.service';
import { MissionCollaborationStatus } from '../enums/missions.enums';
import { EcosystemActivitiesService } from '../../ecosystem/services/ecosystem-activities.service';
import { EcosystemActivityType, EcosystemActivityEntityType } from '../../ecosystem/enums/ecosystem.enums';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Church } from 'src/core/churches/entities/church.entity';

@Injectable()
export class MissionCollaborationsService {
  constructor(
    @InjectRepository(MissionCollaboration)
    private readonly collabsRepo: Repository<MissionCollaboration>,
    @InjectRepository(Church)
    private readonly churchRepo: Repository<Church>,
    private readonly policies: MissionsPolicies,
    private readonly missionsService: MissionsService,
    private readonly activitiesService: EcosystemActivitiesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(missionId: string, dto: CreateMissionCollaborationDto, actor: Person): Promise<MissionCollaboration> {
    const mission = await this.missionsService.findOne(missionId);

    if (!(await this.policies.canCollaborate(actor, mission, dto.churchId))) {
      throw new ForbiddenException('No tienes permiso para colaborar en nombre de esa iglesia o la misión no está activa');
    }

    const collab = this.collabsRepo.create({
      ...dto,
      missionProjectId: missionId,
    });

    const saved = await this.collabsRepo.save(collab);

    if (saved.status === MissionCollaborationStatus.ACTIVE) {
      const church = await this.churchRepo.findOne({ where: { id: dto.churchId } });
      await this.activitiesService.logActivity({
        actorPersonId: actor.id,
        activityType: EcosystemActivityType.MISSION_JOINED,
        entityId: saved.id,
        entityType: EcosystemActivityEntityType.MISSION_COLLABORATION,
        relatedChurchId: dto.churchId,
      });

      let recipientPersonId = mission.leaderId;

      if (!recipientPersonId && mission.creatorChurchId) {
        const creatorChurch = await this.churchRepo.findOne({
          where: { id: mission.creatorChurchId },
          relations: ['publicProfile']
        });

        if (creatorChurch && creatorChurch.publicProfile) {
          recipientPersonId = creatorChurch.publicProfile.claimerPersonId || creatorChurch.publicProfile.creatorPersonId;
        }
      }

      if (recipientPersonId) {
        this.eventEmitter.emit('mission.collaboration.joined', {
          recipientPersonId,
          churchName: church?.canonicalName || 'Una iglesia',
          missionName: mission.title,
        });
      }
    }

    return saved;
  }
}
