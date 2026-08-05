import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChurchClaim } from '../entities/church_claim.entity';
import { ChurchClaimStatus } from '../../enums/public.enums';

@Injectable()
export class ChurchClaimsService {
  constructor(
    @InjectRepository(ChurchClaim)
    private readonly repo: Repository<ChurchClaim>,
  ) {}

  async pendingClaims() {
    const rows = await this.repo.find({
      where: { status: ChurchClaimStatus.PENDING },
      relations: ['church', 'church.publicProfile', 'claimantPerson'],
      order: { createdAt: 'ASC' },
    });

    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      createdAt: row.createdAt,
      evidence: row.evidence ?? null,
      church: {
        id: row.churchId,
        name: row.church?.canonicalName ?? 'Iglesia desconocida',
        slug: row.church?.publicProfile?.slug ?? null,
        logoUrl: row.church?.publicProfile?.logoUrl ?? null,
      },
      claimant: {
        id: row.claimantPersonId,
        firstName: row.claimantPerson?.firstName ?? null,
        lastName: row.claimantPerson?.lastName ?? null,
        avatarUrl: row.claimantPerson?.avatarUrl ?? null,
      },
    }));
  }
}
