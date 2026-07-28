import { NotFoundException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PublicChurchRelationStatus,
  PublicChurchRelationType,
} from '../../enums/public.enums';
import { ChurchOwnershipService } from './church-ownership.service';
import { ChurchPublicProfile } from '../entities/church_public_profile.entity';
import { PublicChurchRelation } from '../entities/public_church_relation.entity';

@Injectable()
export class ChurchPublicAdminService {
  constructor(
    @InjectRepository(ChurchPublicProfile)
    private readonly profiles: Repository<ChurchPublicProfile>,
    @InjectRepository(PublicChurchRelation)
    private readonly relations: Repository<PublicChurchRelation>,
    private readonly ownership: ChurchOwnershipService,
  ) {}

  async myChurches(personId: string) {
    const churchIds = await this.ownership.getOwnedChurchIds(personId);
    if (!churchIds.length) return [];

    const rows = await this.profiles
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.church', 'c')
      .where('p.churchId IN (:...churchIds)', { churchIds })
      .getMany();
    const pendingRows = await this.relations
      .createQueryBuilder('r')
      .select('r.churchId', 'churchId')
      .addSelect('COUNT(*)', 'count')
      .where('r.churchId IN (:...churchIds)', { churchIds })
      .andWhere('r.status = :status', {
        status: PublicChurchRelationStatus.PENDING,
      })
      .groupBy('r.churchId')
      .getRawMany();
    const pendingMap = new Map(
      pendingRows.map((x) => [x.churchId, Number(x.count)]),
    );

    return rows.map((r) => ({
      churchId: r.churchId,
      slug: r.slug,
      name: r.church.canonicalName,
      city: r.city ?? null,
      country: r.country ?? null,
      coverUrl: r.coverUrl ?? null,
      verification: { isVerified: r.isVerified },
      counters: { pendingRelations: pendingMap.get(r.churchId) ?? 0 },
    }));
  }

  async dashboard(personId: string, churchId: string) {
    await this.ownership.assertOwnsChurch(personId, churchId);
    const profile = await this.profiles
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.church', 'c')
      .where('p.churchId = :churchId', { churchId })
      .getOne();
    if (!profile) throw new NotFoundException('Public profile not found');

    const counts = await this.relations
      .createQueryBuilder('r')
      .select('r.relationType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('r.churchId = :churchId', { churchId })
      .andWhere('r.status = :status', {
        status: PublicChurchRelationStatus.APPROVED,
      })
      .groupBy('r.relationType')
      .getRawMany();
    const pending = await this.relations.count({
      where: [
        {
          churchId,
          relationType: PublicChurchRelationType.COMMUNITY_MEMBER,
          status: PublicChurchRelationStatus.PENDING,
        },
        {
          churchId,
          relationType: PublicChurchRelationType.REGULAR_VISITOR,
          status: PublicChurchRelationStatus.PENDING,
        },
      ],
    });
    let nearby = 0;
    if (profile.city) {
      const location = await this.relations.manager
        .getRepository('need_locations')
        .findOne({ where: { city: profile.city } });
      if (location) {
        const signals: any[] = await this.relations.manager
          .getRepository('need_signals')
          .find({ where: { needLocationId: location.id, status: 'OPEN' } });
        nearby = signals.reduce((acc, s) => acc + s.impactedPeopleCount, 0);
      }
    }
    const map = new Map(counts.map((x) => [x.type, Number(x.count)]));

    return {
      church: {
        churchId: profile.churchId,
        slug: profile.slug,
        name: profile.church.canonicalName,
        city: profile.city ?? null,
        state: profile.state ?? null,
        country: profile.country ?? null,
        isVerified: profile.isVerified,
      },
      pendingRelations: pending,
      counters: {
        visitors: map.get(PublicChurchRelationType.REGULAR_VISITOR) ?? 0,
        members: map.get(PublicChurchRelationType.COMMUNITY_MEMBER) ?? 0,
        lookingForChurchNearby: nearby,
      },
    };
  }

  async listPending(personId: string) {
    const churchIds = await this.ownership.getOwnedChurchIds(personId);
    if (!churchIds.length) return [];
    const rows = await this.relations.find({
      where: churchIds.flatMap((churchId) => [
        {
          churchId,
          relationType: PublicChurchRelationType.COMMUNITY_MEMBER,
          status: PublicChurchRelationStatus.PENDING,
        },
        {
          churchId,
          relationType: PublicChurchRelationType.REGULAR_VISITOR,
          status: PublicChurchRelationStatus.PENDING,
        },
      ]),
      relations: ['person'],
      order: { createdAt: 'ASC' },
    });
    return rows.map((row) => ({
      id: row.id,
      churchId: row.churchId,
      relationType: row.relationType,
      status: row.status,
      note: null,
      ecclesialRole: row.ecclesialRole,
      createdAt: row.createdAt,
      person: row.person
        ? {
            id: row.person.id,
            firstName: row.person.firstName,
            lastName: row.person.lastName,
            avatarUrl: row.person.avatarUrl,
          }
        : null,
    }));
  }

  async listCommunity(
    personId: string,
    churchId: string,
    type?: PublicChurchRelationType,
  ) {
    await this.ownership.assertOwnsChurch(personId, churchId);

    const where: any = {
      churchId,
      status: PublicChurchRelationStatus.APPROVED,
    };
    if (type) where.relationType = type;

    const rows = await this.relations.find({
      where,
      relations: ['person'],
      order: { createdAt: 'DESC' },
    });

    return rows.map((row) => ({
      id: row.id,
      churchId: row.churchId,
      relationType: row.relationType,
      status: row.status,
      ecclesialRole: row.ecclesialRole,
      createdAt: row.createdAt,
      person: row.person
        ? {
            id: row.person.id,
            firstName: row.person.firstName,
            lastName: row.person.lastName,
            avatarUrl: row.person.avatarUrl,
          }
        : null,
    }));
  }
}
