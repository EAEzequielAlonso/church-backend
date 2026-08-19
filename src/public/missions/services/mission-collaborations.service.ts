import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MissionCollaboration } from '../entities/mission-collaboration.entity';
import { CreateMissionCollaborationDto } from '../dto/create-mission-collaboration.dto';
import { UpdateMissionCollaborationDto } from '../dto/update-mission-collaboration.dto';
import { Person } from 'src/core/users/entities/person.entity';
import { MissionRules } from '../policies/mission.rules';
import { MissionsService } from './missions.service';
import { MissionCollaborationStatus } from '../enums/missions.enums';
import { EcosystemActivitiesService } from '../../ecosystem/services/ecosystem-activities.service';
import {
  EcosystemActivityType,
  EcosystemActivityEntityType,
} from '../../ecosystem/enums/ecosystem.enums';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Church } from 'src/core/churches/entities/church.entity';

import { PaginationQueryDto } from 'src/shared/dtos/pagination-query.dto';
import { PaginatedResponseDto } from 'src/shared/dtos/paginated-response.dto';
import { MissionCollaborationQueryDto } from '../dto/mission-collaboration-query.dto';
import { MissionCollaborationProductDto } from '../dto/mission-collaboration-product.dto';

@Injectable()
export class MissionCollaborationsService {
  constructor(
    @InjectRepository(MissionCollaboration)
    private readonly collabsRepo: Repository<MissionCollaboration>,
    @InjectRepository(Church)
    private readonly churchRepo: Repository<Church>,
    private readonly missionRules: MissionRules,
    private readonly missionsService: MissionsService,
    private readonly activitiesService: EcosystemActivitiesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findPublicCollaborations(
    missionId: string,
    query: MissionCollaborationQueryDto,
    actor?: Person,
  ): Promise<PaginatedResponseDto<MissionCollaborationProductDto>> {
    const {
      page = 1,
      limit = 12,
      sort = 'createdAt',
      order = 'DESC',
      status,
    } = query;

    const where: any = { missionProjectId: missionId };
    if (status) where.status = status;
    // Note: Publicly, we might only want to show ACTIVE or PENDING collaborations.
    // If not filtered by user, we'll return what they ask. (Typically ACTIVE).

    const [data, total] = await this.collabsRepo.findAndCount({
      where,
      relations: ['church', 'church.publicProfile'],
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

    const dtos = await Promise.all(
      data.map(async (collab) => {
        let isCollabChurchManager = false;
        if (actor) {
          try {
            await this.missionRules.assertCanWithdrawCollaboration(
              actor,
              collab.churchId,
            );
            isCollabChurchManager = true;
          } catch {
            isCollabChurchManager = false;
          }
        }
        const actions = this.missionRules.getCollaborationAllowedActions(
          actor?.id,
          mission,
          collab,
          isManager,
          isCollabChurchManager,
        );
        return MissionCollaborationProductDto.fromEntity(collab, actions);
      }),
    );

    return new PaginatedResponseDto(dtos, total, page, limit);
  }

  async findManagementCollaborations(
    missionId: string,
    query: MissionCollaborationQueryDto,
    actor: Person,
    isChurchAdmin?: boolean,
  ): Promise<PaginatedResponseDto<MissionCollaborationProductDto>> {
    const mission = await this.missionsService.findOne(missionId);
    await this.missionRules.assertCanManage(actor, mission, isChurchAdmin);

    const {
      page = 1,
      limit = 12,
      sort = 'createdAt',
      order = 'DESC',
      status,
    } = query;

    const where: any = { missionProjectId: missionId };
    if (status) where.status = status;

    const [data, total] = await this.collabsRepo.findAndCount({
      where,
      relations: ['church', 'church.publicProfile'],
      skip: (page - 1) * limit,
      take: limit,
      order: { [sort]: order },
    });

    const dtos = await Promise.all(
      data.map(async (collab) => {
        // Si el actor puede ver esto es porque es isManager (Mission Admin).
        // Puede que sea también Admin de la iglesia colaboradora, comprobemos:
        let isCollabChurchManager = false;
        try {
          await this.missionRules.assertCanWithdrawCollaboration(
            actor,
            collab.churchId,
          );
          isCollabChurchManager = true;
        } catch {
          isCollabChurchManager = false;
        }

        const actions = this.missionRules.getCollaborationAllowedActions(
          actor.id,
          mission,
          collab,
          true,
          isCollabChurchManager,
        );
        return MissionCollaborationProductDto.fromEntity(collab, actions);
      }),
    );

    return new PaginatedResponseDto(dtos, total, page, limit);
  }

  async findChurchCollaborations(
    churchId: string,
    query: PaginationQueryDto,
    actor: Person,
  ): Promise<PaginatedResponseDto<MissionCollaborationProductDto>> {
    // Verificar si el actor tiene permisos para administrar la iglesia
    await this.missionRules.assertCanCreate(actor, churchId);

    const { page = 1, limit = 12, sort = 'createdAt', order = 'DESC' } = query;

    const [data, total] = await this.collabsRepo.findAndCount({
      where: { churchId },
      relations: ['church', 'church.publicProfile', 'missionProject'],
      skip: (page - 1) * limit,
      take: limit,
      order: { [sort]: order },
    });

    const dtos = await Promise.all(
      data.map(async (collab) => {
        // Como el endpoint exige ser administrador de la iglesia, isCollabChurchManager es true
        const isCollabChurchManager = true;

        // El actor es administrador de la iglesia colaboradora, pero no necesariamente de la misión (isManager)
        // Se evalúa a false por defecto a menos que haya requerimiento. HATEOAS manejará el resto.
        const isManager = false;

        // Pasar 'undefined' como mission para que el evaluador no rompa si no lo tiene (o pasar collab.missionProject si es requerido)
        const actions = this.missionRules.getCollaborationAllowedActions(
          actor.id,
          collab.missionProject,
          collab,
          isManager,
          isCollabChurchManager,
        );
        return MissionCollaborationProductDto.fromEntity(collab, actions);
      }),
    );

    return new PaginatedResponseDto(dtos, total, page, limit);
  }

  async create(
    missionId: string,
    dto: CreateMissionCollaborationDto,
    actor: Person,
  ): Promise<MissionCollaboration> {
    const mission = await this.missionsService.findOne(missionId);

    await this.missionRules.assertCanSubmitCollaboration(
      actor,
      mission,
      dto.churchId,
    );

    const collab = this.collabsRepo.create({
      ...dto,
      missionProjectId: missionId,
    });

    const saved = await this.collabsRepo.save(collab);

    // Default status is PENDING, so we notify the mission admin that a request was made
    if (saved.status === MissionCollaborationStatus.PENDING) {
      const missionAdminId = await this.getMissionAdminId(mission);
      const church = await this.churchRepo.findOne({
        where: { id: dto.churchId },
      });

      if (missionAdminId) {
        this.eventEmitter.emit('mission.collaboration.requested', {
          recipientPersonId: missionAdminId,
          churchName: church?.canonicalName || 'Una iglesia',
          missionName: mission.title,
        });
      }
    }

    return saved;
  }

  async update(
    missionId: string,
    collabId: string,
    dto: UpdateMissionCollaborationDto,
    actor: Person,
  ): Promise<MissionCollaboration> {
    const mission = await this.missionsService.findOne(missionId);
    const collab = await this.collabsRepo.findOne({
      where: { id: collabId, missionProjectId: missionId },
      relations: ['church'],
    });

    if (!collab) throw new NotFoundException('Colaboración no encontrada');

    await this.missionRules.assertCanManageCollaboration(
      actor,
      mission,
      collab.churchId,
    );
    this.missionRules.assertCanEdit(mission);

    this.collabsRepo.merge(collab, dto);
    return this.collabsRepo.save(collab);
  }

  async approveCollaboration(
    missionId: string,
    collabId: string,
    actor: Person,
  ): Promise<MissionCollaboration> {
    const mission = await this.missionsService.findOne(missionId);
    const collab = await this.collabsRepo.findOne({
      where: { id: collabId, missionProjectId: missionId },
      relations: ['church', 'church.publicProfile'],
    });

    if (!collab) throw new NotFoundException('Colaboración no encontrada');
    if (collab.status !== MissionCollaborationStatus.PENDING) {
      throw new ForbiddenException(
        'La colaboración no está pendiente de aprobación',
      );
    }

    await this.missionRules.assertCanApproveCollaboration(actor, mission);

    collab.status = MissionCollaborationStatus.ACTIVE;
    const saved = await this.collabsRepo.save(collab);

    const supportTypes: string[] = [];
    if (saved.prayerSupport) supportTypes.push('Oración');
    if (saved.financialSupport) supportTypes.push('Financiera');
    if (saved.volunteerSupport) supportTypes.push('Voluntarios');
    if (saved.materialSupport) supportTypes.push('Material');
    if (saved.logisticSupport) supportTypes.push('Logística');

    await this.activitiesService.logActivity({
      actorPersonId: actor.id,
      activityType: EcosystemActivityType.MISSION_JOINED,
      entityId: saved.id,
      entityType: EcosystemActivityEntityType.MISSION_COLLABORATION,
      relatedChurchId: collab.churchId,
      metadata: {
        missionProjectId: mission.id,
        missionTitle: mission.title,
        missionLogoUrl: mission.creatorChurch?.publicProfile?.logoUrl || null,
        churchName: collab.church?.canonicalName || 'Una iglesia',
        churchLogoUrl: collab.church?.publicProfile?.logoUrl || null,
        supportTypes,
      },
    });

    const churchAdminId = await this.getChurchAdminId(collab.churchId);

    if (churchAdminId) {
      this.eventEmitter.emit('mission.collaboration.joined', {
        recipientPersonId: churchAdminId,
        churchName: collab.church?.canonicalName || 'Una iglesia',
        missionName: mission.title,
      });
    }

    return saved;
  }

  async rejectCollaboration(
    missionId: string,
    collabId: string,
    actor: Person,
  ): Promise<MissionCollaboration> {
    const mission = await this.missionsService.findOne(missionId);
    const collab = await this.collabsRepo.findOne({
      where: { id: collabId, missionProjectId: missionId },
    });

    if (!collab) throw new NotFoundException('Colaboración no encontrada');
    if (collab.status !== MissionCollaborationStatus.PENDING) {
      throw new ForbiddenException('La colaboración no está pendiente');
    }

    await this.missionRules.assertCanApproveCollaboration(actor, mission);

    collab.status = MissionCollaborationStatus.REJECTED;
    const saved = await this.collabsRepo.save(collab);

    const churchAdminId = await this.getChurchAdminId(collab.churchId);
    if (churchAdminId) {
      this.eventEmitter.emit('mission.collaboration.rejected', {
        recipientPersonId: churchAdminId,
        missionName: mission.title,
      });
    }

    return saved;
  }

  async withdrawCollaboration(
    missionId: string,
    collabId: string,
    actor: Person,
  ): Promise<MissionCollaboration> {
    const mission = await this.missionsService.findOne(missionId);
    const collab = await this.collabsRepo.findOne({
      where: { id: collabId, missionProjectId: missionId },
    });

    if (!collab) throw new NotFoundException('Colaboración no encontrada');
    if (
      collab.status !== MissionCollaborationStatus.PENDING &&
      collab.status !== MissionCollaborationStatus.ACTIVE
    ) {
      throw new ForbiddenException(
        'No se puede retirar esta colaboración en su estado actual',
      );
    }

    await this.missionRules.assertCanWithdrawCollaboration(
      actor,
      collab.churchId,
    );

    collab.status = MissionCollaborationStatus.WITHDRAWN;
    const saved = await this.collabsRepo.save(collab);

    const church = await this.churchRepo.findOne({
      where: { id: collab.churchId },
    });
    const missionAdminId = await this.getMissionAdminId(mission);

    if (missionAdminId) {
      this.eventEmitter.emit('mission.collaboration.withdrawn', {
        recipientPersonId: missionAdminId,
        churchName: church?.canonicalName || 'Una iglesia',
        missionName: mission.title,
      });
    }

    return saved;
  }

  async revokeCollaboration(
    missionId: string,
    collabId: string,
    actor: Person,
  ): Promise<MissionCollaboration> {
    const mission = await this.missionsService.findOne(missionId);
    const collab = await this.collabsRepo.findOne({
      where: { id: collabId, missionProjectId: missionId },
    });

    if (!collab) throw new NotFoundException('Colaboración no encontrada');
    if (collab.status !== MissionCollaborationStatus.ACTIVE) {
      throw new ForbiddenException(
        'Solo se pueden revocar colaboraciones activas',
      );
    }

    await this.missionRules.assertCanManage(actor, mission);

    collab.status = MissionCollaborationStatus.REVOKED;
    const saved = await this.collabsRepo.save(collab);

    const churchAdminId = await this.getChurchAdminId(collab.churchId);
    if (churchAdminId) {
      this.eventEmitter.emit('mission.collaboration.revoked', {
        recipientPersonId: churchAdminId,
        missionName: mission.title,
      });
    }

    return saved;
  }

  async remove(
    missionId: string,
    collabId: string,
    actor: Person,
  ): Promise<void> {
    const mission = await this.missionsService.findOne(missionId);
    const collab = await this.collabsRepo.findOne({
      where: { id: collabId, missionProjectId: missionId },
    });

    if (!collab) throw new NotFoundException('Colaboración no encontrada');

    await this.missionRules.assertCanManageCollaboration(
      actor,
      mission,
      collab.churchId,
    );
    this.missionRules.assertCanEdit(mission);

    await this.collabsRepo.remove(collab);
  }

  private async getMissionAdminId(mission: any): Promise<string | null> {
    let recipientPersonId = mission.leaderId;

    if (!recipientPersonId && mission.creatorChurchId) {
      const creatorChurch = await this.churchRepo.findOne({
        where: { id: mission.creatorChurchId },
        relations: ['publicProfile'],
      });

      if (creatorChurch && creatorChurch.publicProfile) {
        recipientPersonId =
          creatorChurch.publicProfile.claimerPersonId ||
          creatorChurch.publicProfile.creatorPersonId;
      }
    }
    return recipientPersonId || null;
  }

  private async getChurchAdminId(churchId: string): Promise<string | null> {
    const church = await this.churchRepo.findOne({
      where: { id: churchId },
      relations: ['publicProfile'],
    });

    if (church && church.publicProfile) {
      return (
        church.publicProfile.claimerPersonId ||
        church.publicProfile.creatorPersonId ||
        null
      );
    }
    return null;
  }
}
