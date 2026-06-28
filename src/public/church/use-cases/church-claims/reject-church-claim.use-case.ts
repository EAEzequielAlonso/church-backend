import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChurchClaim } from '../../entities/church_claim.entity';
import { ChurchClaimStatus } from '../../../enums/public.enums';
import { Church } from '../../../../core/churches/entities/church.entity';
import { Person } from '../../../../core/users/entities/person.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class RejectChurchClaimUseCase {
  constructor(
    @InjectRepository(ChurchClaim) private readonly claimsRepo: Repository<ChurchClaim>,
    @InjectRepository(Church) private readonly churchesRepo: Repository<Church>,
    @InjectRepository(Person) private readonly personRepo: Repository<Person>,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async execute(claimId: string, notes: string | null) {
    const claim = await this.claimsRepo.findOne({ where: { id: claimId } });
    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.status !== ChurchClaimStatus.PENDING) throw new BadRequestException('Claim is not pending');

    claim.status = ChurchClaimStatus.REJECTED;
    claim.verificationNotes = notes;
    await this.claimsRepo.save(claim);

    const person = await this.personRepo.findOne({ where: { id: claim.claimantPersonId }, relations: ['user'] });
    const church = await this.churchesRepo.findOne({ where: { id: claim.churchId } });

    this.eventEmitter.emit('church-claim.rejected', {
      recipientPersonId: claim.claimantPersonId,
      email: person?.user?.email,
      churchName: church?.canonicalName || 'la iglesia',
    });

    return { claimId: claim.id, churchId: claim.churchId, status: claim.status, notes: claim.verificationNotes ?? null };
  }
}
