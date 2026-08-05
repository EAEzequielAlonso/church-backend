import {
  NotFoundException,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublicChurchRelation } from '../entities/public_church_relation.entity';
import { Church } from '../../../core/churches/entities/church.entity';
import { EcosystemHistory } from '../../ecosystem/entities/ecosystem-history.entity';
import {
  PublicChurchRelationStatus,
  PublicChurchRelationType,
  EcosystemHistoryEvent,
  EcclesialRole,
} from '../../enums/public.enums';
import { ChurchOwnershipService } from '../services/church-ownership.service';
import { ChurchResponsibilitiesService } from '../services/church-responsibilities.service';
import { EcosystemActivitiesService } from '../../ecosystem/services/ecosystem-activities.service';
import {
  EcosystemActivityType,
  EcosystemActivityEntityType,
} from '../../ecosystem/enums/ecosystem.enums';
import { PublicRelationsService } from '../services/public-relations.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ManagePublicRelationUseCase {
  constructor(
    @InjectRepository(PublicChurchRelation)
    private readonly relations: Repository<PublicChurchRelation>,
    @InjectRepository(EcosystemHistory)
    private readonly history: Repository<EcosystemHistory>,
    private readonly ownership: ChurchOwnershipService,
    private readonly responsibilities: ChurchResponsibilitiesService,
    private readonly activitiesService: EcosystemActivitiesService,
    private readonly publicRelationsService: PublicRelationsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async approve(personId: string, relationId: string) {
    return this.relations.manager.transaction(async (manager) => {
      const row = await manager.findOne(PublicChurchRelation, {
        where: { id: relationId },
        lock: { mode: 'pessimistic_write' },
      });

      // Fetch relations separately to avoid PostgreSQL 'FOR UPDATE cannot be applied to the nullable side of an outer join' error
      let church: Church | null = null;
      if (row) {
        church = await manager.findOne(Church, {
          where: { id: row.churchId },
          relations: ['publicProfile'],
        });
      }

      if (!row) throw new NotFoundException('Relation not found');
      if (row.status !== PublicChurchRelationStatus.PENDING) {
        throw new BadRequestException('Relation is not pending');
      }

      await this.ownership.assertOwnsChurch(personId, row.churchId);

      // Resolve exclusivity by passing row.id to exclude it from deletion
      await this.publicRelationsService.resolveExclusiveRelation(
        manager,
        row.personId,
        row.id,
      );

      row.status = PublicChurchRelationStatus.APPROVED;
      const saved = await manager.save(PublicChurchRelation, row);

      if (
        row.relationType === PublicChurchRelationType.COMMUNITY_MEMBER ||
        row.relationType === PublicChurchRelationType.REGULAR_VISITOR
      ) {
        const eventType =
          row.relationType === PublicChurchRelationType.COMMUNITY_MEMBER
            ? EcosystemHistoryEvent.MEMBER_JOINED
            : EcosystemHistoryEvent.VISITOR_JOINED;

        await manager.save(
          EcosystemHistory,
          manager.create(EcosystemHistory, {
            personId: row.personId,
            churchId: row.churchId,
            eventType,
          }),
        );

        if (row.relationType === PublicChurchRelationType.COMMUNITY_MEMBER) {
          await this.activitiesService.logActivity({
            actorPersonId: row.personId,
            relatedChurchId: row.churchId,
            activityType: EcosystemActivityType.MEMBER_JOINED,
            entityId: row.personId,
            entityType: EcosystemActivityEntityType.PERSON,
            country: church?.publicProfile?.country,
            state: church?.publicProfile?.state,
            city: church?.publicProfile?.city,
          }, manager);
        }

        this.eventEmitter.emit('community.join.approved', {
          recipientPersonId: row.personId,
          churchName: church?.canonicalName || 'la iglesia',
          relationType: row.relationType,
        });
      }

      return {
        id: saved.id,
        churchId: saved.churchId,
        relationType: saved.relationType,
        status: saved.status,
        updatedAt: saved.updatedAt,
      };
    });
  }

  async reject(personId: string, relationId: string) {
    return this.relations.manager.transaction(async (manager) => {
      const row = await manager.findOne(PublicChurchRelation, {
        where: { id: relationId },
        lock: { mode: 'pessimistic_write' },
      });

      let church: Church | null = null;
      if (row) {
        church = await manager.findOne(Church, {
          where: { id: row.churchId },
        });
      }

      if (!row) throw new NotFoundException('Relation not found');
      if (row.status !== PublicChurchRelationStatus.PENDING) {
        throw new BadRequestException('Relation is not pending');
      }

      await this.ownership.assertOwnsChurch(personId, row.churchId);

      // Log history of rejection
      await manager.save(
        EcosystemHistory,
        manager.create(EcosystemHistory, {
          personId: row.personId,
          churchId: row.churchId,
          eventType: EcosystemHistoryEvent.COMMUNITY_JOIN_REJECTED,
        }),
      );

      await manager.delete(PublicChurchRelation, { id: relationId });

      this.eventEmitter.emit('community.join.rejected', {
        recipientPersonId: row.personId,
        churchName: church?.canonicalName || 'la iglesia',
      });

      return { deleted: true };
    });
  }

  async updateEcclesialRole(
    personId: string,
    relationId: string,
    role: string,
  ) {
    const row = await this.relations.findOne({ where: { id: relationId } });
    if (!row) throw new NotFoundException('Relation not found');
    await this.ownership.assertOwnsChurch(personId, row.churchId);

    if (row.status !== PublicChurchRelationStatus.APPROVED) {
      throw new BadRequestException('Relation must be APPROVED');
    }
    if (
      row.relationType === PublicChurchRelationType.REGULAR_VISITOR &&
      role !== EcclesialRole.NONE
    ) {
      throw new BadRequestException('Visitors cannot have an ecclesial role');
    }

    const oldRole = row.ecclesialRole;
    row.ecclesialRole = role as any;
    await this.relations.save(row);

    await this.history.save(
      this.history.create({
        personId: row.personId,
        churchId: row.churchId,
        eventType: EcosystemHistoryEvent.ECCLESIAL_ROLE_CHANGED,
        metadata: {
          actorPersonId: personId,
          oldRole,
          newRole: role,
        },
      }),
    );

    const church = await this.relations.manager.findOne(Church, {
      where: { id: row.churchId },
    });

    this.eventEmitter.emit('community.role.updated', {
      recipientPersonId: row.personId,
      churchName: church?.canonicalName || 'la iglesia',
      newRole: role,
    });

    return { success: true };
  }

  async remove(personId: string, relationId: string) {
    return this.relations.manager.transaction(async (manager) => {
      // 1. Bloquear solo la relacion sin joins
      const row = await manager.findOne(PublicChurchRelation, {
        where: { id: relationId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!row) throw new NotFoundException('Relation not found');
      await this.ownership.assertOwnsChurch(personId, row.churchId);

      if (row.status !== PublicChurchRelationStatus.APPROVED) {
        throw new BadRequestException('Relation is not approved');
      }

      if (row.isCurrentAdmin) {
        throw new BadRequestException(
          'Cannot remove an administrator from community',
        );
      }

      await this.responsibilities.assertPersonHasNoActiveResponsibilities(
        manager,
        row.personId,
        row.churchId
      );

      // 2. Obtener church por separado para la notificacion
      const church = await manager.findOne(Church, {
        where: { id: row.churchId },
      });

      await manager.delete(PublicChurchRelation, { id: relationId });

      if (
        row.relationType === PublicChurchRelationType.COMMUNITY_MEMBER ||
        row.relationType === PublicChurchRelationType.REGULAR_VISITOR
      ) {
        await manager.save(
          EcosystemHistory,
          manager.create(EcosystemHistory, {
            personId: row.personId,
            churchId: row.churchId,
            eventType:
              row.relationType === PublicChurchRelationType.COMMUNITY_MEMBER
                ? EcosystemHistoryEvent.MEMBER_LEFT
                : EcosystemHistoryEvent.VISITOR_LEFT,
          }),
        );
      }

      this.eventEmitter.emit('community.relation.removed', {
        recipientPersonId: row.personId,
        churchName: church?.canonicalName || 'la iglesia',
      });

      return { deleted: true };
    });
  }
}
