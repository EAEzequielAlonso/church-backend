import { NotFoundException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublicChurchRelation } from '../entities/public_church_relation.entity';
import { EcosystemHistory } from '../../ecosystem/entities/ecosystem-history.entity';
import {
  PublicChurchRelationStatus,
  PublicChurchRelationType,
  EcosystemHistoryEvent,
} from '../../enums/public.enums';
import { ChurchOwnershipService } from '../services/church-ownership.service';
import { EcosystemActivitiesService } from '../../ecosystem/services/ecosystem-activities.service';
import {
  EcosystemActivityType,
  EcosystemActivityEntityType,
} from '../../ecosystem/enums/ecosystem.enums';

@Injectable()
export class ManagePublicRelationUseCase {
  constructor(
    @InjectRepository(PublicChurchRelation)
    private readonly relations: Repository<PublicChurchRelation>,
    @InjectRepository(EcosystemHistory)
    private readonly history: Repository<EcosystemHistory>,
    private readonly ownership: ChurchOwnershipService,
    private readonly activitiesService: EcosystemActivitiesService,
  ) {}

  async approve(personId: string, relationId: string) {
    return this.updateStatus(
      personId,
      relationId,
      PublicChurchRelationStatus.APPROVED,
    );
  }

  async reject(personId: string, relationId: string) {
    return this.updateStatus(
      personId,
      relationId,
      PublicChurchRelationStatus.REJECTED,
    );
  }

  async updateEcclesialRole(
    personId: string,
    relationId: string,
    role: string,
  ) {
    const row = await this.relations.findOne({ where: { id: relationId } });
    if (!row) throw new NotFoundException('Relation not found');
    await this.ownership.assertOwnsChurch(personId, row.churchId);

    // Cast to enum. If invalid, it will fail validation or just be a string. But let's assume it's valid if it comes from DTO.
    row.ecclesialRole = role as any;
    await this.relations.save(row);
    return { success: true };
  }

  async remove(personId: string, relationId: string) {
    const row = await this.relations.findOne({ where: { id: relationId } });
    if (!row) throw new NotFoundException('Relation not found');
    await this.ownership.assertOwnsChurch(personId, row.churchId);
    await this.relations.delete({ id: relationId });

    if (
      row.relationType === PublicChurchRelationType.COMMUNITY_MEMBER ||
      row.relationType === PublicChurchRelationType.REGULAR_VISITOR
    ) {
      await this.history.save(
        this.history.create({
          personId: row.personId,
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

  private async updateStatus(
    personId: string,
    relationId: string,
    status: PublicChurchRelationStatus,
  ) {
    const row = await this.relations.findOne({
      where: { id: relationId },
      relations: ['church', 'church.publicProfile'],
    });
    if (!row) throw new NotFoundException('Relation not found');
    await this.ownership.assertOwnsChurch(personId, row.churchId);
    row.status = status;
    const saved = await this.relations.save(row);

    if (
      row.relationType === PublicChurchRelationType.COMMUNITY_MEMBER ||
      row.relationType === PublicChurchRelationType.REGULAR_VISITOR
    ) {
      if (status === PublicChurchRelationStatus.APPROVED) {
        const eventType =
          row.relationType === PublicChurchRelationType.COMMUNITY_MEMBER
            ? EcosystemHistoryEvent.MEMBER_JOINED
            : EcosystemHistoryEvent.VISITOR_JOINED;

        await this.history.save(
          this.history.create({
            personId: row.personId,
            churchId: row.churchId,
            eventType,
          }),
        );

        const activityType =
          row.relationType === PublicChurchRelationType.COMMUNITY_MEMBER
            ? EcosystemActivityType.MEMBER_JOINED
            : EcosystemActivityType.FOLLOWER_JOINED;

        await this.activitiesService.logActivity({
          actorPersonId: row.personId,
          relatedChurchId: row.churchId,
          activityType,
          entityId: row.personId,
          entityType: EcosystemActivityEntityType.PERSON,
          country: row.church?.publicProfile?.country,
          state: row.church?.publicProfile?.state,
          city: row.church?.publicProfile?.city,
        });
      }
    }

    return {
      id: saved.id,
      churchId: saved.churchId,
      relationType: saved.relationType,
      status: saved.status,
      updatedAt: saved.updatedAt,
    };
  }
}
