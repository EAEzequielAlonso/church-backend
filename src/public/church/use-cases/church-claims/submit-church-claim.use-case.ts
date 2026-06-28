import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Church } from '../../../../core/churches/entities/church.entity';
import { ChurchClaim } from '../../entities/church_claim.entity';
import { ChurchClaimStatus, EcosystemHistoryEvent } from '../../../enums/public.enums';
import { CreateChurchClaimDto } from '../../dto/church-claim/create-church-claim.dto';
import { ChurchLifecycleService } from '../../church-profile/services/church-lifecycle.service'; 
import { EcosystemHistory } from '../../../ecosystem/entities/ecosystem-history.entity';

@Injectable()
export class SubmitChurchClaimUseCase {
  constructor(
    @InjectRepository(ChurchClaim) private readonly claimsRepo: Repository<ChurchClaim>,
    @InjectRepository(Church) private readonly churches: Repository<Church>,
    @InjectRepository(EcosystemHistory) private readonly historyRepo: Repository<EcosystemHistory>,
    private readonly lifecycleService: ChurchLifecycleService,
  ) { }

  async execute(personId: string, dto: CreateChurchClaimDto) {
    const church = await this.churches.findOne({
      where: { id: dto.churchId },
      relations: ['publicProfile']
    });
    if (!church) throw new NotFoundException('Church not found');

    if (church.publicProfile?.isCurrentAdmin) {
      throw new BadRequestException('Esta iglesia ya tiene una administración activa.');
    }

    const anyPendingClaim = await this.claimsRepo.findOne({
      where: { churchId: dto.churchId, status: ChurchClaimStatus.PENDING }
    });

    if (anyPendingClaim) {
      throw new BadRequestException('Ya existe un reclamo de administración en proceso para esta iglesia.');
    }

    // Cancel any previous pending or approved claims for OTHER churches
    // Rule: "Una sola iglesia. Si reclama otra iglesia: debe abandonar la anterior."
    await this.claimsRepo.update(
      { claimantPersonId: personId, status: ChurchClaimStatus.PENDING },
      { status: ChurchClaimStatus.CANCELLED }
    );
    await this.claimsRepo.update(
      { claimantPersonId: personId, status: ChurchClaimStatus.APPROVED },
      { status: ChurchClaimStatus.CANCELLED }
    );

    const claim = this.claimsRepo.create({
      churchId: dto.churchId,
      claimantPersonId: personId,
      status: ChurchClaimStatus.PENDING,
      verificationNotes: dto.evidence ?? null
    });
    const savedClaim = await this.claimsRepo.save(claim);

    // Transition lifecycle to CLAIM_PENDING if it was previously DISCOVERED
    try {
      await this.lifecycleService.transitionState(dto.churchId);
    } catch (e) {
      // Ignored if profile does not exist yet
    }

    await this.historyRepo.save(
      this.historyRepo.create({
        personId: personId,
        churchId: dto.churchId,
        eventType: EcosystemHistoryEvent.CLAIM_SUBMITTED,
        metadata: { churchName: church.canonicalName },
      })
    );

    return savedClaim;
  }
}
