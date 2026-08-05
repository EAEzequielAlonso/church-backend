import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChurchClaim } from '../../entities/church_claim.entity';
import {
  ChurchClaimStatus,
  PublicChurchRelationStatus,
  PublicChurchRelationType,
} from '../../../enums/public.enums';

import { EcosystemHistory } from '../../../ecosystem/entities/ecosystem-history.entity';
import { EcosystemHistoryEvent } from '../../../enums/public.enums';
import { ChurchPublicProfile } from '../../entities/church_public_profile.entity';
import { PublicChurchRelation } from '../../entities/public_church_relation.entity';
import { EcosystemActivitiesService } from '../../../ecosystem/services/ecosystem-activities.service';
import {
  EcosystemActivityType,
  EcosystemActivityEntityType,
} from '../../../ecosystem/enums/ecosystem.enums';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Person } from '../../../../core/users/entities/person.entity';
import { PublicRelationsService } from '../../services/public-relations.service';

@Injectable()
export class ApproveChurchClaimUseCase {
  constructor(
    @InjectRepository(ChurchClaim)
    private readonly claimsRepo: Repository<ChurchClaim>,
    @InjectRepository(EcosystemHistory)
    private readonly historyRepo: Repository<EcosystemHistory>,
    @InjectRepository(ChurchPublicProfile)
    private readonly profilesRepo: Repository<ChurchPublicProfile>,
    @InjectRepository(PublicChurchRelation)
    private readonly relationsRepo: Repository<PublicChurchRelation>,
    @InjectRepository(Person) private readonly personRepo: Repository<Person>,
    private readonly activitiesService: EcosystemActivitiesService,
    private readonly publicRelationsService: PublicRelationsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(claimId: string) {
    return this.claimsRepo.manager.transaction(async (manager) => {
      const claim = await manager.findOne(ChurchClaim, {
        where: { id: claimId },
      });
      if (!claim) throw new NotFoundException('Claim not found');
      if (claim.status !== ChurchClaimStatus.PENDING)
        throw new BadRequestException('Claim is not pending');

      claim.status = ChurchClaimStatus.APPROVED;
      claim.verifiedAt = new Date();
      await manager.save(claim);

      // Fetch ChurchPublicProfile to check claimerPersonId and get metadata
      const profile = await manager.findOne(ChurchPublicProfile, {
        where: { churchId: claim.churchId },
        relations: ['church'],
      });

      if (profile) {
        // Update ChurchPublicProfile. claimerPersonId is immutable.
        profile.isCurrentAdmin = true;
        if (!profile.claimerPersonId) {
          profile.claimerPersonId = claim.claimantPersonId;
        }
        await manager.save(profile);

        // Enforce exclusivity and assign admin relation transactionally
        await this.publicRelationsService.assignAdminRelationTransactional(
          manager,
          claim.claimantPersonId,
          claim.churchId,
        );

        await this.activitiesService.logActivity(
          {
            actorPersonId: claim.claimantPersonId,
            relatedChurchId: claim.churchId,
            activityType: EcosystemActivityType.CHURCH_CLAIM_APPROVED,
            entityId: claim.churchId,
            entityType: EcosystemActivityEntityType.CHURCH,
            country: profile.country,
            state: profile.state,
            city: profile.city,
          },
          manager,
        );
      }

      // Record Ecosystem History
      const historyEvents = [
        manager.create(EcosystemHistory, {
          personId: claim.claimantPersonId,
          churchId: claim.churchId,
          eventType: EcosystemHistoryEvent.CLAIM_APPROVED,
          metadata: {
            claimId: claim.id,
            churchName: profile?.church?.canonicalName,
            geoCity: profile?.city,
            geoState: profile?.state,
            geoCountry: profile?.country,
          },
        }),
        manager.create(EcosystemHistory, {
          personId: claim.claimantPersonId,
          churchId: claim.churchId,
          eventType: EcosystemHistoryEvent.ADMIN_ASSIGNED,
        }),
      ];
      await manager.save(historyEvents);

      const person = await manager.findOne(Person, {
        where: { id: claim.claimantPersonId },
        relations: ['user'],
      });
      this.eventEmitter.emit('church-claim.approved', {
        recipientPersonId: claim.claimantPersonId,
        email: person?.user?.email,
        churchName: profile?.church?.canonicalName || 'la iglesia',
      });

      return {
        claimId: claim.id,
        churchId: claim.churchId,
        status: claim.status,
      };
    });
  }
}
