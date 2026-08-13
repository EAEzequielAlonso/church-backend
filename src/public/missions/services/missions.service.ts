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
import { CancelMissionDto } from '../dto/cancel-mission.dto';
import { Person } from 'src/core/users/entities/person.entity';
import { Church } from 'src/core/churches/entities/church.entity';
import { PaginationQueryDto } from 'src/shared/dtos/pagination-query.dto';
import { PaginatedResponseDto } from 'src/shared/dtos/paginated-response.dto';
import { MissionProductDto } from '../dto/mission-product.dto';
import { MissionProjectResponseDto } from '../dto/mission-response.dto';

import { EcosystemActivitiesService } from '../../ecosystem/services/ecosystem-activities.service';
import {
  EcosystemActivityType,
  EcosystemActivityEntityType,
} from '../../ecosystem/enums/ecosystem.enums';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChurchPublicProfile } from '../../church/entities/church_public_profile.entity';
import { In } from 'typeorm';
import { MissionRules } from '../policies/mission.rules';
import {
  MissionOutcomeType,
  MissionProjectStatus,
  MissionSourceType,
  MissionCollaborationStatus,
  MissionNeedStatus,
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
    private readonly missionRules: MissionRules,
    private readonly activitiesService: EcosystemActivitiesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    dto: CreateMissionProjectDto,
    actor: Person,
    isChurchAdmin?: boolean,
  ): Promise<MissionProject> {
    await this.missionRules.assertCanCreate(actor, dto.creatorChurchId);

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
        actorChurchId: savedMission.creatorChurchId,
        metadata: {
          missionTitle: savedMission.title,
          missionSummary: savedMission.summary,
          city: savedMission.city,
          state: savedMission.state,
          country: savedMission.country,
        },
      });
    }

    return savedMission;
  }

  async findAllActive(query: PaginationQueryDto): Promise<PaginatedResponseDto<MissionProject>> {
    const { page = 1, limit = 12, sort = 'createdAt', order = 'DESC' } = query;
    const [data, total] = await this.missionsRepo.findAndCount({
      where: { status: MissionProjectStatus.ACTIVE },
      relations: ['creatorChurch', 'creatorChurch.publicProfile', 'leader'],
      skip: (page - 1) * limit,
      take: limit,
      order: { [sort]: order },
    });
    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findAllByChurch(churchId: string, query: PaginationQueryDto): Promise<PaginatedResponseDto<MissionProject>> {
    const { page = 1, limit = 12, sort = 'createdAt', order = 'DESC' } = query;
    const [data, total] = await this.missionsRepo.findAndCount({
      where: { creatorChurchId: churchId },
      relations: ['creatorChurch', 'creatorChurch.publicProfile', 'leader'],
      skip: (page - 1) * limit,
      take: limit,
      order: { [sort]: order as 'ASC' | 'DESC' },
    });
    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findAllManagementByChurch(churchId: string, query: PaginationQueryDto, actor: Person): Promise<PaginatedResponseDto<MissionProductDto>> {
    const { page = 1, limit = 12, sort = 'createdAt', order = 'DESC' } = query;
    
    // Validar permiso de management sobre la iglesia
    await this.missionRules.assertCanCreate(actor, churchId); // Si puede crear en nombre de la iglesia, puede listar

    const [data, total] = await this.missionsRepo.findAndCount({
      where: { creatorChurchId: churchId },
      relations: ['creatorChurch', 'creatorChurch.publicProfile', 'leader'],
      skip: (page - 1) * limit,
      take: limit,
      order: { [sort]: order as 'ASC' | 'DESC' },
    });

    const items = data.map((mission) => {
      const allowedActions = this.missionRules.getProjectAllowedActions(mission, true);
      const responseDto = MissionProjectResponseDto.fromEntity(mission);
      
      const emptyStats = {
        totalNeeds: 0,
        fulfilledNeeds: 0,
        totalCollaborations: 0,
        activeCollaborations: 0,
        publishedReports: 0,
      };

      return MissionProductDto.fromResponse(responseDto, allowedActions, emptyStats);
    });

    return new PaginatedResponseDto(items, total, page, limit);
  }

  async findOne(id: string): Promise<MissionProject> {
    const mission = await this.missionsRepo.findOne({
      where: { id },
      relations: [
        'creatorChurch',
        'creatorChurch.publicProfile',
        'leader',
      ],
    });

    if (!mission) throw new NotFoundException('MissionProject no encontrado');
    return mission;
  }

  async getManagementMission(id: string, actor: Person): Promise<MissionProductDto> {
    const mission = await this.findOne(id);
    const canManage = await this.missionRules.canManage(actor, mission);
    if (!canManage) {
      throw new ForbiddenException('No tienes permiso para gestionar esta misión');
    }

    // Calcular estadísticas de forma eficiente (sin eager loading)
    const statsResult = await this.missionsRepo.manager.query(`
      SELECT 
        (SELECT COUNT(1)::int FROM mission_needs WHERE "missionProjectId" = $1 AND status != 'CANCELLED') as "totalNeeds",
        (SELECT COUNT(1)::int FROM mission_needs WHERE "missionProjectId" = $1 AND status = 'COMPLETED') as "fulfilledNeeds",
        (SELECT COUNT(1)::int FROM mission_collaborations WHERE "missionProjectId" = $1 AND status != 'REJECTED' AND status != 'WITHDRAWN') as "totalCollaborations",
        (SELECT COUNT(1)::int FROM mission_collaborations WHERE "missionProjectId" = $1 AND status = 'ACTIVE') as "activeCollaborations",
        (SELECT COUNT(1)::int FROM mission_reports WHERE "missionProjectId" = $1) as "publishedReports"
    `, [id]);

    const statsRow = statsResult[0];
    const statistics = {
      totalNeeds: statsRow.totalNeeds || 0,
      fulfilledNeeds: statsRow.fulfilledNeeds || 0,
      totalCollaborations: statsRow.totalCollaborations || 0,
      activeCollaborations: statsRow.activeCollaborations || 0,
      publishedReports: statsRow.publishedReports || 0,
    };

    const allowedActions = this.missionRules.getProjectAllowedActions(mission, true);
    const responseDto = MissionProjectResponseDto.fromEntity(mission);

    return MissionProductDto.fromResponse(responseDto, allowedActions, statistics);
  }

  async getPublicMission(id: string): Promise<MissionProject> {
    const mission = await this.missionsRepo.findOne({
      where: { id },
      relations: [
        'creatorChurch',
        'creatorChurch.publicProfile',
        'leader',
        'needs',
        'needs.fulfilledByChurch',
        'needs.fulfilledByPerson',
        'collaborations',
        'collaborations.church',
        'reports',
        'reports.author',
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
    await this.missionRules.assertCanManage(actor, mission, isChurchAdmin);

    this.missionsRepo.merge(mission, dto);

    // Fix: TypeORM merge does not update the relation if only the primitive ID is modified 
    // but the relation object is already loaded by findOne().
    if (dto.leaderId) {
      mission.leader = { id: dto.leaderId } as Person;
    }
    
    return this.missionsRepo.save(mission);
  }

  async changeStatus(
    id: string,
    newStatus: MissionProjectStatus,
    actor: Person,
    isChurchAdmin?: boolean,
  ): Promise<MissionProject> {
    const mission = await this.findOne(id);
    await this.missionRules.assertCanManage(actor, mission, isChurchAdmin);
    this.missionRules.assertCanChangeState(mission.status, newStatus);

    const previousStatus = mission.status;
    mission.status = newStatus;
    const savedMission = await this.missionsRepo.save(mission);

    // Eventos unívocos
    if (previousStatus === MissionProjectStatus.DRAFT && newStatus === MissionProjectStatus.ACTIVE) {
      await this.activitiesService.logActivity({
        actorPersonId: actor.id,
        activityType: EcosystemActivityType.MISSION_CREATED,
        entityId: savedMission.id,
        entityType: EcosystemActivityEntityType.MISSION_PROJECT,
        actorChurchId: savedMission.creatorChurchId,
        metadata: {
          missionTitle: savedMission.title,
          missionSummary: savedMission.summary,
          city: savedMission.city,
          state: savedMission.state,
          country: savedMission.country,
        },
      });
    } else if (previousStatus === MissionProjectStatus.ACTIVE && newStatus === MissionProjectStatus.PAUSED) {
      await this.activitiesService.logActivity({
        actorPersonId: actor.id,
        activityType: EcosystemActivityType.MISSION_PAUSED,
        entityId: savedMission.id,
        entityType: EcosystemActivityEntityType.MISSION_PROJECT,
        actorChurchId: savedMission.creatorChurchId,
        metadata: {
          missionTitle: savedMission.title,
        },
      });
    } else if (previousStatus === MissionProjectStatus.PAUSED && newStatus === MissionProjectStatus.ACTIVE) {
      await this.activitiesService.logActivity({
        actorPersonId: actor.id,
        activityType: EcosystemActivityType.MISSION_RESUMED,
        entityId: savedMission.id,
        entityType: EcosystemActivityEntityType.MISSION_PROJECT,
        actorChurchId: savedMission.creatorChurchId,
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
    await this.missionRules.assertCanManage(actor, mission, isChurchAdmin);
    this.missionRules.assertCanChangeState(mission.status, MissionProjectStatus.COMPLETED);

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
          actorChurchId: saved.creatorChurchId,
          metadata: {
            missionTitle: saved.title,
            outcomeType: saved.outcomeType,
          },
        },
        manager,
      );

      // Cascadas optimizadas sin Eager Loading
      await manager.update(
        'mission_needs',
        {
          missionProjectId: mission.id,
          status: In([MissionNeedStatus.OPEN, MissionNeedStatus.IN_PROGRESS]),
        },
        { status: MissionNeedStatus.COMPLETED },
      );

      await manager.update(
        'mission_collaborations',
        {
          missionProjectId: mission.id,
          status: MissionCollaborationStatus.PENDING,
        },
        { status: MissionCollaborationStatus.WITHDRAWN },
      );

      return saved;
    });
  }

  async cancelMission(
    id: string,
    dto: CancelMissionDto,
    actor: Person,
    isChurchAdmin?: boolean,
  ): Promise<MissionProject> {
    const mission = await this.findOne(id);
    await this.missionRules.assertCanManage(actor, mission, isChurchAdmin);
    this.missionRules.assertCanChangeState(mission.status, MissionProjectStatus.CANCELLED);

    mission.status = MissionProjectStatus.CANCELLED;
    mission.closureReason = dto.reason;
    
    const saved = await this.missionsRepo.manager.transaction(async (manager) => {
      const savedMission = await manager.save(mission);
      
      // Cascadas optimizadas sin Eager Loading
      await manager.update(
        'mission_needs',
        {
          missionProjectId: mission.id,
          status: In([MissionNeedStatus.OPEN, MissionNeedStatus.IN_PROGRESS]),
        },
        { status: MissionNeedStatus.CANCELLED },
      );

      // Cancelar todas las colaboraciones excepto las que ya fueron retiradas
      await manager.createQueryBuilder()
        .update('mission_collaborations')
        .set({ status: MissionCollaborationStatus.WITHDRAWN })
        .where('missionProjectId = :id', { id: mission.id })
        .andWhere('status != :withdrawnStatus', { withdrawnStatus: MissionCollaborationStatus.WITHDRAWN })
        .execute();
      
      return savedMission;
    });

    await this.activitiesService.logActivity({
      actorPersonId: actor.id,
      activityType: EcosystemActivityType.MISSION_CANCELLED,
      entityId: saved.id,
      entityType: EcosystemActivityEntityType.MISSION_PROJECT,
      actorChurchId: saved.creatorChurchId,
      metadata: {
        missionTitle: saved.title,
        reason: saved.closureReason,
      },
    });

    const activeCollabs = await this.missionsRepo.manager.query(
      `SELECT "churchId" FROM mission_collaborations WHERE "missionProjectId" = $1 AND status != $2`,
      [mission.id, MissionCollaborationStatus.WITHDRAWN]
    );
    const churchIds = activeCollabs.map((c: any) => c.churchId);
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

  async remove(id: string, actor: Person): Promise<void> {
    const mission = await this.findOne(id);
    await this.missionRules.assertCanDelete(actor, mission);
    
    // softRemove o delete normal. En este caso uso softRemove
    await this.missionsRepo.softRemove(mission);
  }
}
