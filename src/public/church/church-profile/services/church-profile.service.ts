import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChurchClaim } from 'src/public/church/entities/church_claim.entity';
import { Person } from 'src/core/users/entities/person.entity';
import { ChurchPublicProfile } from 'src/public/church/entities/church_public_profile.entity';
import { PublicChurchRelation } from 'src/public/church/entities/public_church_relation.entity';
import { EcosystemContributionsService } from 'src/public/ecosystem/services/ecosystem-contributions.service';
import { ChurchClaimStatus, PublicChurchRelationStatus, PublicChurchRelationType } from 'src/public/enums/public.enums';

@Injectable()
export class ChurchProfileService {
  constructor(
    @InjectRepository(ChurchPublicProfile) private readonly profiles: Repository<ChurchPublicProfile>,
    @InjectRepository(PublicChurchRelation) private readonly relations: Repository<PublicChurchRelation>,
    @InjectRepository(ChurchClaim) private readonly claims: Repository<ChurchClaim>,
    private readonly contributionsService: EcosystemContributionsService,
  ) { }

  async bySlug(slug: string, currentPersonId?: string) {
    const profile = await this.profiles
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.church', 'c')
      .leftJoinAndSelect('p.schedules', 's')
      .leftJoinAndSelect('p.doctrinalIdentity', 'd')
      .where('p.slug = :slug', { slug })
      .orderBy('s.createdAt', 'ASC')
      .getOne();
    if (!profile) return null;
    const counts = await this.relations.createQueryBuilder('r').select('r.relationType', 'type').addSelect('COUNT(*)', 'count').where('r.churchId = :churchId', { churchId: profile.churchId }).andWhere('r.status = :status', { status: PublicChurchRelationStatus.APPROVED }).groupBy('r.relationType').getRawMany();
    const map = new Map(counts.map((x) => [x.type, Number(x.count)]));
    const meetings = (profile.schedules ?? []).map((schedule) => ({
      id: schedule.id,
      dayOfWeek: schedule.dayOfWeek ?? '',
      title: schedule.title,
      startTime: schedule.startTime ?? '',
    }));

    const leadershipRelations = await this.relations.createQueryBuilder('r')
      .leftJoin(Person, 'p', 'p.id = CAST(r.personId AS UUID)')
      .select('p.id', 'personId')
      .addSelect('p.firstName', 'firstName')
      .addSelect('p.lastName', 'lastName')
      .addSelect('p.avatarUrl', 'avatarUrl')
      .addSelect('r.ecclesialRole', 'role')
      .where('r.churchId = :churchId', { churchId: profile.churchId })
      .andWhere('r.status = :status', { status: PublicChurchRelationStatus.APPROVED })
      .andWhere('r.ecclesialRole != :noneRole', { noneRole: 'NONE' })
      .getRawMany();

    const communityImpact = await this.contributionsService.getAggregatedContributionsForChurch(profile.church.id);

    const pendingClaimQuery = await this.claims.createQueryBuilder('c')
      .leftJoin(Person, 'p', 'p.id = CAST(c.claimantPersonId AS UUID)')
      .select('p.firstName', 'firstName')
      .addSelect('p.lastName', 'lastName')
      .addSelect('c.status', 'status')
      .addSelect('c.createdAt', 'createdAt')
      .where('c.churchId = :churchId', { churchId: profile.churchId })
      .andWhere('c.status = :status', { status: ChurchClaimStatus.PENDING })
      .getRawOne();

    let pendingClaim = null;
    if (pendingClaimQuery) {
      pendingClaim = {
        firstName: pendingClaimQuery.firstName,
        lastName: pendingClaimQuery.lastName,
        status: pendingClaimQuery.status,
        createdAt: pendingClaimQuery.createdAt,
      };
    }

    let rejectedClaim = null;
    if (currentPersonId) {
      const rejectedClaimQuery = await this.claims.createQueryBuilder('c')
        .select('c.verificationNotes', 'notes')
        .addSelect('c.createdAt', 'createdAt')
        .where('c.churchId = :churchId', { churchId: profile.churchId })
        .andWhere('c.claimantPersonId = :personId', { personId: currentPersonId })
        .andWhere('c.status = :status', { status: ChurchClaimStatus.REJECTED })
        .orderBy('c.createdAt', 'DESC')
        .getRawOne();

      if (rejectedClaimQuery) {
        rejectedClaim = {
          notes: rejectedClaimQuery.notes,
          createdAt: rejectedClaimQuery.createdAt,
        };
      }
    }

    return {
      church: {
        id: profile.church.id,
        slug: profile.slug,
        canonicalSlug: profile.slug,
        name: profile.church.canonicalName,
        seoTitle: `${profile.church.canonicalName} | Perfil`,
        seoDescription: profile.publicDescription?.slice(0, 160) ?? null,
        publicImage: profile.coverUrl ?? profile.mainImageUrl ?? profile.logoUrl ?? null,
        logoUrl: profile.logoUrl ?? null,
        coverUrl: profile.coverUrl ?? null,
        mainImageUrl: profile.mainImageUrl ?? null,
        website: profile.website ?? null,
        creator: profile.creatorPersonId ?? null,
        claimer: profile.claimerPersonId ?? null,
        isCurrentAdmin: profile.isCurrentAdmin ?? null,
        pendingClaim,
        rejectedClaim,
      },
      description: profile.publicDescription ?? null,
      meetings,
      doctrinalIdentity: profile.doctrinalIdentity ?? null,
      leadership: leadershipRelations,
      denomination: profile.denomination ?? null,
      serviceTimes: meetings.reduce<Record<string, string>>((acc, meeting) => {
        const key = `${meeting.dayOfWeek || 'reunion'} - ${meeting.title}`.trim();
        acc[key] = meeting.startTime || 'Horario a confirmar';
        return acc;
      }, {}),
      location: {
        address: profile.address ?? null,
        normalizedAddress: profile.address ?? null,
        city: profile.city?.trim() ?? null,
        state: profile.state?.trim() ?? null,
        country: profile.country?.trim() ?? null,
        latitude: profile.latitude ? Number(profile.latitude) : null,
        longitude: profile.longitude ? Number(profile.longitude) : null,
        geoPrecision: profile.geoPrecision,
      },
      social: { instagram: profile.instagram ?? null, facebook: profile.facebook ?? null, links: {} },
      contact: { publicEmail: profile.contactEmail ?? null, publicPhone: profile.contactPhone ?? null },
      verification: { isVerified: profile.isVerified },
      counters: { regularVisitors: map.get(PublicChurchRelationType.REGULAR_VISITOR) ?? 0, publicMembers: map.get(PublicChurchRelationType.COMMUNITY_MEMBER) ?? 0 },
      communityImpact,
    };
  }

  async mapSummary(churchId: string) {
    const profile = await this.profiles.findOne({
      where: { churchId },
      relations: ['church']
    });
    if (!profile) return null;
    return {
      id: profile.church.id,
      title: profile.church.canonicalName,
      type: 'CHURCH',
      description: profile.publicDescription?.slice(0, 150) ?? null,
      city: profile.city,
      state: profile.state,
      ctaLink: `/iglesias/${profile.slug}`
    };
  }
}
