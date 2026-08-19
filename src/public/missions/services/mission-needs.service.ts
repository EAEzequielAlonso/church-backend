import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MissionNeed } from '../entities/mission-need.entity';
import { MissionCollaboration } from '../entities/mission-collaboration.entity';
import { CreateMissionNeedDto } from '../dto/create-mission-need.dto';
import { UpdateMissionNeedDto } from '../dto/update-mission-need.dto';
import { FulfillMissionNeedDto } from '../dto/fulfill-mission-need.dto';
import { PaginationQueryDto } from 'src/shared/dtos/pagination-query.dto';
import { PaginatedResponseDto } from 'src/shared/dtos/paginated-response.dto';
import { MissionNeedQueryDto } from '../dto/mission-need-query.dto';
import { MissionNeedProductDto } from '../dto/mission-need-product.dto';
import { Person } from 'src/core/users/entities/person.entity';
import { MissionRules } from '../policies/mission.rules';
import { MissionsService } from './missions.service';
import { ChurchPublicProfile } from '../../church/entities/church_public_profile.entity';
import {
  MissionCollaborationStatus,
  MissionNeedStatus,
} from '../enums/missions.enums';
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
    @InjectRepository(MissionCollaboration)
    private readonly collabsRepo: Repository<MissionCollaboration>,
    @InjectRepository(ChurchPublicProfile)
    private readonly churchProfileRepo: Repository<ChurchPublicProfile>,
    private readonly missionRules: MissionRules,
    private readonly missionsService: MissionsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly activitiesService: EcosystemActivitiesService,
  ) {}

  async findPublicNeeds(
    missionId: string,
    query: MissionNeedQueryDto,
    actor?: Person,
  ): Promise<PaginatedResponseDto<MissionNeedProductDto>> {
    const {
      page = 1,
      limit = 12,
      sort = 'createdAt',
      order = 'DESC',
      search,
      status,
    } = query;

    const where: any = { missionProjectId: missionId };
    if (status) where.status = status;

    const [data, total] = await this.needsRepo.findAndCount({
      where,
      relations: [
        'fulfilledByChurch',
        'fulfilledByChurch.publicProfile',
        'fulfilledByPerson',
      ],
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

    const dtos = data.map((need) => {
      const actions = this.missionRules.getNeedAllowedActions(
        actor?.id,
        mission,
        need,
        isManager,
      );
      return MissionNeedProductDto.fromEntity(need, actions);
    });

    return new PaginatedResponseDto(dtos, total, page, limit);
  }

  async findManagementNeeds(
    missionId: string,
    query: MissionNeedQueryDto,
    actor: Person,
    isChurchAdmin?: boolean,
  ): Promise<PaginatedResponseDto<MissionNeedProductDto>> {
    const mission = await this.missionsService.findOne(missionId);
    await this.missionRules.assertCanManage(actor, mission, isChurchAdmin);

    const {
      page = 1,
      limit = 12,
      sort = 'createdAt',
      order = 'DESC',
      search,
      status,
    } = query;

    const where: any = { missionProjectId: missionId };
    if (status) where.status = status;

    const [data, total] = await this.needsRepo.findAndCount({
      where,
      relations: [
        'fulfilledByChurch',
        'fulfilledByChurch.publicProfile',
        'fulfilledByPerson',
      ],
      skip: (page - 1) * limit,
      take: limit,
      order: { [sort]: order },
    });

    const dtos = data.map((need) => {
      const actions = this.missionRules.getNeedAllowedActions(
        actor.id,
        mission,
        need,
        true,
      );
      return MissionNeedProductDto.fromEntity(need, actions);
    });

    return new PaginatedResponseDto(dtos, total, page, limit);
  }

  async create(
    missionId: string,
    dto: CreateMissionNeedDto,
    actor: Person,
    isChurchAdmin?: boolean,
  ): Promise<MissionNeed> {
    const mission = await this.missionsService.findOne(missionId);

    await this.missionRules.assertCanManage(actor, mission, isChurchAdmin);
    this.missionRules.assertCanAddNeed(mission);

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
      actorChurchId: mission.creatorChurchId,
      metadata: {
        missionTitle: mission.title,
        needTitle: saved.title,
        needType: saved.type,
        missionProjectId: mission.id,
      },
    });

    const activeCollabs = await this.collabsRepo.find({
      where: {
        missionProjectId: missionId,
        status: MissionCollaborationStatus.ACTIVE,
      },
      select: ['churchId'],
    });
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

    await this.missionRules.assertCanManage(actor, mission, isChurchAdmin);
    this.missionRules.assertCanAddNeed(mission);

    const need = await this.needsRepo.findOne({
      where: { id: needId, missionProjectId: missionId },
    });
    if (!need) throw new NotFoundException('Need no encontrada');

    this.needsRepo.merge(need, dto);
    return this.needsRepo.save(need);
  }

  async fulfillNeed(
    missionId: string,
    needId: string,
    dto: FulfillMissionNeedDto,
    actor: Person,
    isChurchAdmin?: boolean,
  ): Promise<MissionNeed> {
    const mission = await this.missionsService.findOne(missionId);

    await this.missionRules.assertCanManage(actor, mission, isChurchAdmin);
    this.missionRules.assertCanFulfillNeed(mission);

    const need = await this.needsRepo.findOne({
      where: { id: needId, missionProjectId: missionId },
    });
    if (!need) throw new NotFoundException('Need no encontrada');
    if (need.status === MissionNeedStatus.COMPLETED) {
      throw new ForbiddenException('La necesidad ya se encuentra resuelta');
    }

    need.status = MissionNeedStatus.COMPLETED;
    need.fulfilledByChurchId = dto.churchId || null;
    need.fulfilledByPersonId = dto.personId || actor.id;
    need.fulfilledAt = new Date();

    const saved = await this.needsRepo.save(need);

    await this.activitiesService.logActivity({
      actorPersonId: actor.id,
      activityType: EcosystemActivityType.MISSION_NEED_FULFILLED,
      entityId: saved.id,
      entityType: EcosystemActivityEntityType.MISSION_NEED,
      actorChurchId: mission.creatorChurchId,
      metadata: {
        missionTitle: mission.title,
        needTitle: saved.title,
        needType: saved.type,
        missionProjectId: mission.id,
      },
    });

    return saved;
  }

  async remove(
    missionId: string,
    needId: string,
    actor: Person,
    isChurchAdmin?: boolean,
  ): Promise<void> {
    const mission = await this.missionsService.findOne(missionId);

    await this.missionRules.assertCanManage(actor, mission, isChurchAdmin);
    this.missionRules.assertCanEdit(mission);

    const need = await this.needsRepo.findOne({
      where: { id: needId, missionProjectId: missionId },
    });
    if (!need) throw new NotFoundException('Need no encontrada');

    await this.needsRepo.remove(need);
  }
}
