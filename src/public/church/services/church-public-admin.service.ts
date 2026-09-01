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
import { ChurchFollow } from '../entities/follower.entity';
import { EcosystemHistory } from '../../ecosystem/entities/ecosystem-history.entity';

@Injectable()
export class ChurchPublicAdminService {
  constructor(
    @InjectRepository(ChurchPublicProfile)
    private readonly profiles: Repository<ChurchPublicProfile>,
    @InjectRepository(PublicChurchRelation)
    private readonly relations: Repository<PublicChurchRelation>,
    @InjectRepository(ChurchFollow)
    private readonly followers: Repository<ChurchFollow>,
    @InjectRepository(EcosystemHistory)
    private readonly history: Repository<EcosystemHistory>,
    private readonly ownership: ChurchOwnershipService,
  ) {}

  async getProfileForAdmin(personId: string, churchId: string) {
    await this.ownership.assertOwnsChurch(personId, churchId);
    const profile = await this.profiles.findOne({
      where: { churchId },
      relations: ['schedules', 'doctrinalIdentity'],
    });
    if (!profile) throw new NotFoundException('Public profile not found');

    return {
      churchId: profile.churchId,
      slug: profile.slug,
      isVerified: profile.isVerified,
      publicDescription: profile.publicDescription ?? null,
      denomination: profile.denomination ?? null,
      logoUrl: profile.logoUrl ?? null,
      coverUrl: profile.coverUrl ?? null,
      mainImageUrl: profile.mainImageUrl ?? null,
      contact: {
        contactEmail: profile.contactEmail ?? null,
        contactPhone: profile.contactPhone ?? null,
      },
      socialLinks: {
        website: profile.website ?? null,
        instagram: profile.instagram ?? null,
        facebook: profile.facebook ?? null,
        youtube: profile.youtube ?? null,
      },
      location: {
        address: profile.address ?? null,
        city: profile.city ?? null,
        state: profile.state ?? null,
        country: profile.country ?? null,
        postalCode: profile.postalCode ?? null,
        latitude: profile.latitude ? Number(profile.latitude) : null,
        longitude: profile.longitude ? Number(profile.longitude) : null,
        geoPrecision: profile.geoPrecision,
      },
      schedules: (profile.schedules || []).map((s) => ({
        id: s.id,
        dayOfWeek: s.dayOfWeek,
        title: s.title,
        startTime: s.startTime,
      })),
      doctrinalIdentity: profile.doctrinalIdentity
        ? {
            affirmsScriptureAuthority:
              profile.doctrinalIdentity.affirmsScriptureAuthority,
            affirmsTrinity: profile.doctrinalIdentity.affirmsTrinity,
            affirmsDeityOfChrist:
              profile.doctrinalIdentity.affirmsDeityOfChrist,
            affirmsHumanityOfChrist:
              profile.doctrinalIdentity.affirmsHumanityOfChrist,
            affirmsSalvationByGrace:
              profile.doctrinalIdentity.affirmsSalvationByGrace,
            affirmsBodilyResurrection:
              profile.doctrinalIdentity.affirmsBodilyResurrection,
            affirmsSecondComing: profile.doctrinalIdentity.affirmsSecondComing,
            churchGovernment:
              profile.doctrinalIdentity.churchGovernment ?? null,
            baptismStance: profile.doctrinalIdentity.baptismStance ?? null,
            spiritualGiftsStance:
              profile.doctrinalIdentity.spiritualGiftsStance ?? null,
            eschatologyStance:
              profile.doctrinalIdentity.eschatologyStance ?? null,
            genderRolesStance:
              profile.doctrinalIdentity.genderRolesStance ?? null,
            lordsSupperStance:
              profile.doctrinalIdentity.lordsSupperStance ?? null,
          }
        : null,
    };
  }

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
      .leftJoinAndSelect('p.schedules', 's')
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

    const followersCount = await this.followers.count({
      where: { profileChurchId: profile.id },
    });

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
      profileStatus: {
        hasLogo: !!profile.logoUrl,
        hasCover: !!profile.coverUrl,
        hasDescription: !!profile.publicDescription,
        hasLocation: !!profile.city && !!profile.country && !!profile.address,
        hasSchedules: !!profile.schedules && profile.schedules.length > 0,
        hasContact: !!profile.contactEmail || !!profile.contactPhone,
        hasSocialLinks:
          !!profile.facebook ||
          !!profile.instagram ||
          !!profile.youtube ||
          !!profile.website,
      },
      pendingRelations: pending,
      counters: {
        visitors: map.get(PublicChurchRelationType.REGULAR_VISITOR) ?? 0,
        members: map.get(PublicChurchRelationType.COMMUNITY_MEMBER) ?? 0,
        followers: followersCount,
        lookingForChurchNearby: nearby,
      },
    };
  }

  async activity(personId: string, churchId: string) {
    await this.ownership.assertOwnsChurch(personId, churchId);

    // Only fetch relevant community events for the dashboard
    const allowedEvents = [
      'MEMBER_JOINED',
      'MEMBER_LEFT',
      'VISITOR_JOINED',
      'VISITOR_LEFT',
      'VISITOR_TO_MEMBER',
      'MEMBER_TO_VISITOR',
      'ADMIN_ASSIGNED',
      'ADMIN_REMOVED',
    ];

    const events = await this.history
      .createQueryBuilder('h')
      .leftJoinAndSelect('h.person', 'p')
      .where('h.churchId = :churchId', { churchId })
      .andWhere('h.eventType IN (:...allowedEvents)', { allowedEvents })
      .orderBy('h.createdAt', 'DESC')
      .take(10)
      .getMany();

    return events.map((e) => ({
      id: e.id,
      type: e.eventType,
      createdAt: e.createdAt,
      actor: e.person
        ? {
            publicName: `${e.person.firstName} ${e.person.lastName}`,
            avatarUrl: e.person.avatarUrl,
          }
        : undefined,
    }));
  }

  async listPending(
    personId: string,
    churchId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    await this.ownership.assertOwnsChurch(personId, churchId);

    const [rows, total] = await this.relations.findAndCount({
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
      relations: ['person'],
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data = rows.map((row) => ({
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
            publicName: `${row.person.firstName} ${row.person.lastName}`.trim(),
            avatarUrl: row.person.avatarUrl,
          }
        : null,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async listCommunity(
    personId: string,
    churchId: string,
    page: number = 1,
    limit: number = 20,
    search?: string,
    type?: PublicChurchRelationType,
  ) {
    await this.ownership.assertOwnsChurch(personId, churchId);

    const qb = this.relations
      .createQueryBuilder('r')
      .innerJoinAndSelect('r.person', 'p')
      .where('r.churchId = :churchId', { churchId })
      .andWhere('r.status = :status', {
        status: PublicChurchRelationStatus.APPROVED,
      });

    if (type) {
      qb.andWhere('r.relationType = :type', { type });
    }

    if (search && search.trim().length > 0) {
      const s = `%${search.trim()}%`;
      qb.andWhere('(p.firstName ILIKE :search OR p.lastName ILIKE :search)', {
        search: s,
      });
    }

    qb.orderBy('r.createdAt', 'DESC')
      .addOrderBy('p.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();

    const data = rows.map((row) => ({
      id: row.id,
      churchId: row.churchId,
      relationType: row.relationType,
      status: row.status,
      ecclesialRole: row.ecclesialRole,
      isCurrentAdmin: row.isCurrentAdmin,
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

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async checkSlug(personId: string, churchId: string, slug: string) {
    await this.ownership.assertOwnsChurch(personId, churchId);
    if (!slug) return { available: false };
    const existing = await this.profiles.findOne({ where: { slug } });
    if (!existing || existing.churchId === churchId) {
      return { available: true };
    }
    return { available: false };
  }
}

