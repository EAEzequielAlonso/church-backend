import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Invitation,
  InvitationType,
} from '../../ecosystem/entities/invitation.entity';
import { PublicChurchRelation } from '../entities/public_church_relation.entity';
import { EcosystemHistory } from '../../ecosystem/entities/ecosystem-history.entity';
import {
  PublicChurchRelationStatus,
  PublicChurchRelationType,
  EcosystemHistoryEvent,
} from '../../enums/public.enums';
import { SubmitChurchClaimUseCase } from '../use-cases/church-claims/submit-church-claim.use-case';
import { EcosystemActivitiesService } from '../../ecosystem/services/ecosystem-activities.service';
import {
  EcosystemActivityType,
  EcosystemActivityEntityType,
} from '../../ecosystem/enums/ecosystem.enums';
import { Church } from '../../../core/churches/entities/church.entity';

@Injectable()
export class ChurchInvitationListener {
  private readonly logger = new Logger(ChurchInvitationListener.name);

  constructor(
    @InjectRepository(PublicChurchRelation)
    private readonly relationsRepo: Repository<PublicChurchRelation>,
    @InjectRepository(EcosystemHistory)
    private readonly historyRepo: Repository<EcosystemHistory>,
    @InjectRepository(Church)
    private readonly churchRepo: Repository<Church>,
    private readonly submitChurchClaimUseCase: SubmitChurchClaimUseCase,
    private readonly activitiesService: EcosystemActivitiesService,
    private readonly dataSource: DataSource,
  ) {}

  @OnEvent('invitation.accepted')
  async handleInvitationAccepted(payload: {
    invitation?: Invitation;
    invitedPersonId?: string;
    inviterPersonId: string;
    newUserName: string;
  }) {
    const { invitation, invitedPersonId } = payload;
    if (!invitation || !invitedPersonId) return;

    if (invitation.type === InvitationType.CHURCH_MEMBERSHIP) {
      await this.handleChurchMembership(invitation, invitedPersonId);
    } else if (invitation.type === InvitationType.CHURCH_ADMIN_CLAIM) {
      await this.handleChurchAdminClaim(invitation, invitedPersonId);
    }
  }

  private async handleChurchMembership(
    invitation: Invitation,
    invitedPersonId: string,
  ) {
    if (!invitation.targetChurchId) return;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existing = await queryRunner.manager.findOne(PublicChurchRelation, {
        where: {
          personId: invitedPersonId,
          churchId: invitation.targetChurchId,
        },
      });

      if (!existing) {
        const relation = queryRunner.manager.create(PublicChurchRelation, {
          personId: invitedPersonId,
          churchId: invitation.targetChurchId,
          relationType: PublicChurchRelationType.COMMUNITY_MEMBER,
          status: PublicChurchRelationStatus.APPROVED,
        });
        await queryRunner.manager.save(relation);

        await queryRunner.manager.save(
          EcosystemHistory,
          queryRunner.manager.create(EcosystemHistory, {
            personId: invitedPersonId,
            churchId: invitation.targetChurchId,
            eventType: EcosystemHistoryEvent.MEMBER_JOINED,
          }),
        );

        const church = await queryRunner.manager.findOne(Church, {
          where: { id: invitation.targetChurchId },
          relations: ['publicProfile'],
        });

        await this.activitiesService.logActivity(
          {
            actorPersonId: invitedPersonId,
            relatedChurchId: invitation.targetChurchId,
            activityType: EcosystemActivityType.MEMBER_JOINED,
            entityId: invitedPersonId,
            entityType: EcosystemActivityEntityType.PERSON,
            country: church?.publicProfile?.country,
            state: church?.publicProfile?.state,
            city: church?.publicProfile?.city,
            metadata: {
              relationType: PublicChurchRelationType.COMMUNITY_MEMBER,
            },
          },
          queryRunner.manager,
        );
      }

      await queryRunner.commitTransaction();
    } catch (e) {
      this.logger.error(
        `Error procesando membresía para invitación ${invitation.id}`,
        e,
      );
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  private async handleChurchAdminClaim(
    invitation: Invitation,
    invitedPersonId: string,
  ) {
    if (!invitation.targetChurchId) return;
    try {
      await this.submitChurchClaimUseCase.execute(invitedPersonId, {
        churchId: invitation.targetChurchId,
        evidence: 'Invitación del sistema aceptada',
      });
    } catch (e) {
      this.logger.warn(`No se pudo procesar el Claim automático: ${e.message}`);
    }
  }
}
