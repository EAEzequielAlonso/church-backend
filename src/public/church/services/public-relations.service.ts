import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChurchOwnershipService } from './church-ownership.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Church } from '../../../core/churches/entities/church.entity';
import { PublicChurchRelation } from '../entities/public_church_relation.entity';
import { EcosystemHistory } from '../../ecosystem/entities/ecosystem-history.entity';
import {
  PublicChurchRelationStatus,
  PublicChurchRelationType,
  EcosystemHistoryEvent,
  EcclesialRole,
} from '../../enums/public.enums';
import { ChurchRelationsPolicy } from '../policies/church-relations.policies';
import { CreatePublicRelationDto } from '../dto/create-public-relation.dto';
import { PublicRelationResponseDto } from '../dto/public-relation-response.dto';
import { GeoNormalizationUtil } from '../../ecosystem/geo/utils/geo-normalization.util';
import { EcosystemActivitiesService } from '../../ecosystem/services/ecosystem-activities.service';
import {
  EcosystemActivityType,
  EcosystemActivityEntityType,
} from '../../ecosystem/enums/ecosystem.enums';

@Injectable()
export class PublicRelationsService {
  constructor(
    @InjectRepository(PublicChurchRelation)
    private readonly repo: Repository<PublicChurchRelation>,
    @InjectRepository(EcosystemHistory)
    private readonly historyRepo: Repository<EcosystemHistory>,
    @InjectRepository(Church) private readonly churches: Repository<Church>,
    private readonly eventEmitter: EventEmitter2,
    private readonly ownershipService: ChurchOwnershipService,
    private readonly activitiesService: EcosystemActivitiesService,
  ) {}

  async create(personId: string, dto: CreatePublicRelationDto) {
    if (!dto.churchId) throw new BadRequestException('churchId is required');

    return this.repo.manager.transaction(async (manager) => {
      let hasAdmin = false;

      const church = await manager.findOne(Church, {
        where: { id: dto.churchId },
        relations: ['publicProfile'],
      });
      if (!church) throw new NotFoundException('Church not found');
      hasAdmin = church.publicProfile?.isCurrentAdmin;

      const existing = await manager.findOne(PublicChurchRelation, {
        where: {
          personId,
          churchId: dto.churchId,
          relationType: dto.relationType,
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (existing) throw new BadRequestException('Relation already exists');

      // Rule: Exclusivity for MEMBER and VISITOR
      if (
        dto.relationType === PublicChurchRelationType.COMMUNITY_MEMBER ||
        dto.relationType === PublicChurchRelationType.REGULAR_VISITOR
      ) {
        await this.resolveExclusiveRelation(manager, personId);
      }

      let status = PublicChurchRelationStatus.PENDING;
      if (
        dto.relationType === PublicChurchRelationType.COMMUNITY_MEMBER ||
        dto.relationType === PublicChurchRelationType.REGULAR_VISITOR
      ) {
        status = hasAdmin
          ? PublicChurchRelationStatus.PENDING
          : PublicChurchRelationStatus.APPROVED;
      }

      ChurchRelationsPolicy.validateHierarchyRules(
        dto.relationType,
        EcclesialRole.NONE,
        false, // isCurrentAdmin is initialized as false
        status,
      );

      const relation = manager.create(PublicChurchRelation, {
        personId,
        churchId: dto.churchId,
        relationType: dto.relationType,
        isCurrentAdmin: false,
        status,
      });
      const savedRelation = await manager.save(PublicChurchRelation, relation);

      // Log new relation history if applicable
      if (status === PublicChurchRelationStatus.APPROVED) {
        if (
          dto.relationType === PublicChurchRelationType.COMMUNITY_MEMBER ||
          dto.relationType === PublicChurchRelationType.REGULAR_VISITOR
        ) {
          await manager.save(
            EcosystemHistory,
            manager.create(EcosystemHistory, {
              personId,
              churchId: savedRelation.churchId,
              eventType:
                dto.relationType === PublicChurchRelationType.COMMUNITY_MEMBER
                  ? EcosystemHistoryEvent.MEMBER_JOINED
                  : EcosystemHistoryEvent.VISITOR_JOINED,
            }),
          );

          await this.activitiesService.logActivity(
            {
              actorPersonId: personId,
              relatedChurchId: savedRelation.churchId,
              activityType: EcosystemActivityType.MEMBER_JOINED,
              entityId: personId,
              entityType: EcosystemActivityEntityType.PERSON,
              country: church?.publicProfile?.country,
              state: church?.publicProfile?.state,
              city: church?.publicProfile?.city,
              metadata: {
                relationType: dto.relationType,
              },
            },
            manager,
          );
        }
      }

      // Fetch with relations for returning DTO
      const finalRelation = await manager.findOne(PublicChurchRelation, {
        where: { id: savedRelation.id },
        relations: ['church', 'church.publicProfile', 'person'],
      });

      // Notify admins if it's a pending request
      if (status === PublicChurchRelationStatus.PENDING) {
        const adminPersonIds = await this.ownershipService.getAdminsOfChurch(
          dto.churchId,
        );
        if (adminPersonIds.length > 0) {
          const requesterName = finalRelation.person
            ? `${finalRelation.person.firstName} ${finalRelation.person.lastName}`.trim()
            : 'Un usuario';
          this.eventEmitter.emit('community.join.request', {
            adminPersonIds,
            churchName: finalRelation.church?.canonicalName || 'la iglesia',
            requesterName,
            relationType: dto.relationType,
          });
        }
      }

      return this.toDto(finalRelation);
    });
  }

  async my(personId: string) {
    const rows = await this.repo.find({
      where: { personId },
      relations: ['church', 'church.publicProfile'],
      order: { createdAt: 'DESC' },
    });
    return rows.map((row) => this.toDto(row));
  }

  async remove(personId: string, id: string) {
    const row = await this.repo.findOne({ where: { id, personId } });
    if (!row) throw new NotFoundException('Relation not found');
    await this.repo.delete({ id });

    // Log history if member or visitor
    if (
      row.churchId &&
      (row.relationType === PublicChurchRelationType.COMMUNITY_MEMBER ||
        row.relationType === PublicChurchRelationType.REGULAR_VISITOR)
    ) {
      await this.historyRepo.save(
        this.historyRepo.create({
          personId,
          churchId: row.churchId,
          eventType:
            row.relationType === PublicChurchRelationType.COMMUNITY_MEMBER
              ? EcosystemHistoryEvent.MEMBER_LEFT
              : EcosystemHistoryEvent.VISITOR_LEFT,
        }),
      );
    }

    return { deleted: true };
  }

  async assignAdminRelationTransactional(
    manager: any,
    personId: string,
    churchId: string,
  ) {
    // 1. Resolve exclusivity rule
    await this.resolveExclusiveRelation(manager, personId);

    // 2. Create the new relation as MEMBER, APPROVED and Admin
    const relation = manager.create(PublicChurchRelation, {
      personId,
      churchId,
      relationType: PublicChurchRelationType.COMMUNITY_MEMBER,
      isCurrentAdmin: true,
      status: PublicChurchRelationStatus.APPROVED,
    });
    const savedRelation = await manager.save(PublicChurchRelation, relation);

    // 3. Log history
    await manager.save(
      EcosystemHistory,
      manager.create(EcosystemHistory, {
        personId,
        churchId,
        eventType: EcosystemHistoryEvent.MEMBER_JOINED,
      }),
    );

    return savedRelation;
  }

  public async resolveExclusiveRelation(
    manager: any,
    personId: string,
    excludeId?: string,
  ) {
    const previousRelations = await manager.find(PublicChurchRelation, {
      where: [
        {
          personId,
          relationType: PublicChurchRelationType.COMMUNITY_MEMBER,
        },
        {
          personId,
          relationType: PublicChurchRelationType.REGULAR_VISITOR,
        },
      ],
      lock: { mode: 'pessimistic_write' },
    });

    const toDelete = excludeId
      ? previousRelations.filter((r) => r.id !== excludeId)
      : previousRelations;

    if (toDelete.length > 0) {
      for (const prev of toDelete) {
        await manager.delete(PublicChurchRelation, { id: prev.id });
        if (prev.churchId) {
          await manager.save(
            EcosystemHistory,
            manager.create(EcosystemHistory, {
              personId,
              churchId: prev.churchId,
              eventType:
                prev.relationType === PublicChurchRelationType.COMMUNITY_MEMBER
                  ? EcosystemHistoryEvent.MEMBER_LEFT
                  : EcosystemHistoryEvent.VISITOR_LEFT,
            }),
          );
        }
      }
    }
  }

  private toDto(row: PublicChurchRelation): PublicRelationResponseDto & {
    churchName?: string;
    churchSlug?: string;
    coverUrl?: string;
  } {
    return {
      id: row.id,
      churchId: row.churchId,
      relationType: row.relationType,
      status: row.status,
      note: null,
      createdAt: row.createdAt,
      churchName: row.church?.canonicalName,
      churchSlug: row.church?.publicProfile?.slug,
      coverUrl: row.church?.publicProfile?.coverUrl,
    };
  }

  private clampCoord(
    value: number | undefined,
    min: number,
    max: number,
  ): number | null {
    if (value === undefined || value === null) return null;
    const clamped = Math.max(min, Math.min(max, value));
    return Math.round(clamped * 100) / 100;
  }
}
