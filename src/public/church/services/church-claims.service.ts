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
      order: { createdAt: 'ASC' },
    });
    return rows.map((row) => ({
      id: row.id,
      churchId: row.churchId,
      status: row.status,
      createdAt: row.createdAt,
      verifiedAt: row.verifiedAt ?? null,
    }));
  }
}
