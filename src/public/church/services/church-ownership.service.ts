import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChurchClaim } from '../entities/church_claim.entity';
import { ChurchClaimStatus } from '../../enums/public.enums';

@Injectable()
export class ChurchOwnershipService {
  constructor(
    @InjectRepository(ChurchClaim)
    private readonly claims: Repository<ChurchClaim>,
  ) {}

  async getOwnedChurchIds(personId: string) {
    const claims = await this.claims.find({
      where: { claimantPersonId: personId, status: ChurchClaimStatus.APPROVED },
    });
    return claims.map((x) => x.churchId);
  }

  async assertOwnsChurch(personId: string, churchId: string | null) {
    if (!churchId)
      throw new ForbiddenException('Relation is not bound to a church');
    const claim = await this.claims.findOne({
      where: {
        churchId,
        claimantPersonId: personId,
        status: ChurchClaimStatus.APPROVED,
      },
    });
    if (!claim) throw new ForbiddenException('Not owner of claimed church');
  }
}
