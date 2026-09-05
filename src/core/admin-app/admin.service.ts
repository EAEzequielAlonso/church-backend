import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/core/users/entities/user.entity';
import { Person } from 'src/core/users/entities/person.entity';
import { Repository, MoreThanOrEqual, In } from 'typeorm';
import { ChurchPublicProfile } from '../../public/church/entities/church_public_profile.entity';
import { ChurchClaim } from '../../public/church/entities/church_claim.entity';
import { PublicChurchRelation } from '../../public/church/entities/public_church_relation.entity';
import { DoctrinalOpinion } from '../../public/church/entities/doctrinal-opinion.entity';
import { EcosystemContributionsService } from '../../public/ecosystem/services/ecosystem-contributions.service';
import { ChurchLifecycleService } from 'src/public/church/church-profile/services/church-lifecycle.service';
import {
  ChurchClaimStatus,
  EcclesialRole,
  PublicChurchRelationType,
} from '../../public/enums/public.enums';
import { EcosystemContributionType } from '../../public/ecosystem/enums/ecosystem.enums';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Person) private readonly personRepo: Repository<Person>,
    @InjectRepository(ChurchPublicProfile)
    private readonly profileRepo: Repository<ChurchPublicProfile>,
    @InjectRepository(ChurchClaim)
    private readonly claimRepo: Repository<ChurchClaim>,
    @InjectRepository(PublicChurchRelation)
    private readonly relationRepo: Repository<PublicChurchRelation>,
    @InjectRepository(DoctrinalOpinion)
    private readonly opinionRepo: Repository<DoctrinalOpinion>,
    private readonly contributionsService: EcosystemContributionsService,
    private readonly lifecycleService: ChurchLifecycleService,
  ) {}

  async getDashboardStats() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalChurches,
      verifiedChurches,
      unverifiedChurches,
      managedChurches,
      unmanagedChurches,
      newChurches30d,

      totalUsers,
      totalMembers,
      totalVisitors,
      totalFollowers,
      totalPastors,
      totalLeaders,
      newUsers30d,

      pendingClaims,
      resolvedClaims30d,
    ] = await Promise.all([
      this.profileRepo.count(),
      this.profileRepo.count({ where: { isVerified: true } }),
      this.profileRepo.count({ where: { isVerified: false } }),
      this.profileRepo
        .createQueryBuilder('p')
        .where('p.currentAdminPersonId IS NOT NULL')
        .getCount(),
      this.profileRepo
        .createQueryBuilder('p')
        .where('p.currentAdminPersonId IS NULL')
        .getCount(),
      this.profileRepo.count({
        where: { createdAt: MoreThanOrEqual(thirtyDaysAgo) },
      }),

      this.userRepo.count(),
      this.relationRepo.count({
        where: { relationType: PublicChurchRelationType.COMMUNITY_MEMBER },
      }),
      this.relationRepo.count({
        where: { relationType: PublicChurchRelationType.REGULAR_VISITOR },
      }),
      this.relationRepo.count({
        where: { ecclesialRole: EcclesialRole.PASTOR },
      }),
      this.relationRepo
        .createQueryBuilder('r')
        .where('r.ecclesialRole IN (:...roles)', {
          roles: [
            EcclesialRole.ELDER,
            EcclesialRole.BISHOP,
            EcclesialRole.DEACON,
            EcclesialRole.MINISTRY_LEADER,
          ],
        })
        .getCount(),
      this.userRepo.count({
        where: { createdAt: MoreThanOrEqual(thirtyDaysAgo) },
      }),

      this.claimRepo.count({ where: { status: ChurchClaimStatus.PENDING } }),
      this.claimRepo.count({
        where: [
          {
            status: ChurchClaimStatus.APPROVED,
            updatedAt: MoreThanOrEqual(thirtyDaysAgo),
          },
          {
            status: ChurchClaimStatus.REJECTED,
            updatedAt: MoreThanOrEqual(thirtyDaysAgo),
          },
        ],
      }),
      this.claimRepo
        .createQueryBuilder('c')
        .select('c.churchId')
        .where('c.status = :status', { status: ChurchClaimStatus.PENDING })
        .distinct(true)
        .getCount(),
    ]);

    return {
      churches: {
        total: totalChurches,
        verified: verifiedChurches,
        unverified: unverifiedChurches,
        managed: managedChurches,
        unmanaged: unmanagedChurches,
        newLast30d: newChurches30d,
      },
      users: {
        total: totalUsers,
        members: totalMembers,
        visitors: totalVisitors,
        followers: totalFollowers,
        pastors: totalPastors,
        leaders: totalLeaders,
        newLast30d: newUsers30d,
      },
      claims: {
        pending: pendingClaims,
        resolvedLast30d: resolvedClaims30d,
      },
    };
  }

  async getChurches() {
    const profiles = await this.profileRepo.find({
      relations: ['church'],
      order: { createdAt: 'DESC' },
    });

    const pendingClaims = await this.claimRepo.find({
      where: { status: ChurchClaimStatus.PENDING },
      select: ['churchId'],
    });
    const churchesWithPendingSet = new Set(
      pendingClaims.map((c) => c.churchId),
    );

    return profiles.map((p) => ({
      id: p.churchId,
      canonicalName: p.church?.canonicalName || 'Sin Nombre',
      city: p.city,
      country: p.country,
      isCurrentAdmin: p.isCurrentAdmin,
      isVerified: p.isVerified,
      hasPendingClaim: churchesWithPendingSet.has(p.churchId),
      createdAt: p.createdAt,
      slug: p.slug,
    }));
  }

  async getChurchVerification(id: string) {
    const relation = await this.relationRepo.findOne({
      where: { churchId: id, isCurrentAdmin: true },
    });

    const profile = await this.profileRepo.findOne({
      where: { churchId: id },
      relations: ['church'],
    });
    if (!profile) throw new NotFoundException('Church not found');

    let adminName = null;
    let adminEmail = null;
    
    if (relation) {
      const adminPerson = await this.personRepo.findOne({
        where: { id: relation.personId },
        relations: ['user'],
      });
      if (adminPerson) {
        adminName =
          `${adminPerson.firstName || ''} ${adminPerson.lastName || ''}`.trim();
        adminEmail = adminPerson.user?.email || null;
      }
    }

    const pendingClaim = await this.claimRepo.findOne({
      where: { churchId: id, status: ChurchClaimStatus.PENDING },
      order: { createdAt: 'DESC' },
    });

    let claimData = null;
    if (pendingClaim) {
      const claimPerson = await this.personRepo.findOne({
        where: { id: pendingClaim.claimantPersonId },
      });
      claimData = {
        firstName: claimPerson?.firstName || 'Usuario',
        lastName: claimPerson?.lastName || '',
        createdAt: pendingClaim.createdAt,
      };
    }

    const opinions = await this.opinionRepo.find({
      where: { churchId: id },
      relations: ['person', 'person.user'],
      order: { createdAt: 'DESC' },
    });

    const opinionsData = opinions.map((op) => ({
      id: op.id,
      opinion: op.opinion,
      comment: op.comment,
      createdAt: op.createdAt,
      reviewedByAdmin: op.reviewedByAdmin,
      personName: op.person ? `${op.person.firstName || ''} ${op.person.lastName || ''}`.trim() : 'Usuario',
    }));

    return {
      id: profile.churchId,
      name: profile.church?.canonicalName || 'Sin Nombre',
      city: profile.city,
      state: profile.state,
      country: profile.country,
      address: profile.address,
      publicDescription: profile.publicDescription,
      denomination: profile.denomination,
      logoUrl: profile.logoUrl,
      coverUrl: profile.coverUrl,
      isVerified: profile.isVerified,
      contactEmail: profile.contactEmail,
      contactPhone: profile.contactPhone,
      website: profile.website,
      instagram: profile.instagram,
      facebook: profile.facebook,
      adminName,
      adminEmail,
      pendingClaim: claimData,
      opinions: opinionsData,
      createdAt: profile.createdAt,
      slug: profile.slug,
    };
  }

  async verifyChurch(id: string, isVerified: boolean) {
    const profile = await this.profileRepo.findOne({ where: { churchId: id } });
    if (!profile) throw new NotFoundException('Church not found');
    profile.isVerified = isVerified;
    await this.profileRepo.save(profile);
    return { success: true };
  }

  async deactivateChurch(id: string) {
    const profile = await this.profileRepo.findOne({ where: { churchId: id } });
    if (!profile) throw new NotFoundException('Church not found');
    //profile.isCurrentAdmin = false;
    await this.profileRepo.save(profile);
    return { success: true };
  }

  async getUsers(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [users, total] = await this.userRepo.findAndCount({
      relations: ['person'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const personIds = users.map((u) => u.personId).filter(Boolean);

    let relations: PublicChurchRelation[] = [];
    if (personIds.length > 0) {
      relations = await this.relationRepo.find({
        where: { personId: In(personIds) },
        relations: ['church'],
      });
    }

    const relationsByPerson = new Map<string, PublicChurchRelation>();
    relations.forEach((r) => {
      const existing = relationsByPerson.get(r.personId);
      // Prefer COMMUNITY_MEMBER over REGULAR_VISITOR
      if (
        !existing ||
        (existing.relationType !== PublicChurchRelationType.COMMUNITY_MEMBER &&
          r.relationType === PublicChurchRelationType.COMMUNITY_MEMBER)
      ) {
        relationsByPerson.set(r.personId, r);
      }
    });

    const data = users.map((u) => {
      const relation = u.personId ? relationsByPerson.get(u.personId) : null;
      return {
        id: u.id,
        email: u.email,
        firstName: u.person?.firstName,
        lastName: u.person?.lastName,
        avatarUrl: u.person?.avatarUrl,
        city: u.person?.city,
        state: u.person?.state,
        country: u.person?.country,
        churchRelationType: relation?.relationType || null,
        churchName: relation?.church?.canonicalName || null,
        createdAt: u.createdAt,
      };
    });

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
      limit,
    };
  }

  async toggleUserActive(id: string, isActive: boolean) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['person'],
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.person) {
      user.person.isActive = isActive;
      await this.personRepo.save(user.person);
    }
    return { success: true };
  }

  async getAdministrationRequests() {
    const claims = await this.claimRepo.find({
      relations: ['church', 'church.publicProfile'],
      order: { createdAt: 'DESC' },
    });

    const claimantIds = claims.map((c) => c.claimantPersonId).filter(Boolean);
    const persons = await this.personRepo.findByIds(claimantIds);
    const personMap = new Map(persons.map((p) => [p.id, p]));

    return claims.map((c) => {
      const p = personMap.get(c.claimantPersonId);
      return {
        id: c.id,
        churchId: c.churchId,
        churchName: c.church?.canonicalName || 'Sin Nombre',
        churchSlug: c.church?.publicProfile?.slug,
        churchIsVerified: c.church?.publicProfile?.isVerified || false,
        churchHasAdmin: c.church?.publicProfile?.isCurrentAdmin,
        claimantPersonId: c.claimantPersonId,
        claimantName: p
          ? `${p.firstName || ''} ${p.lastName || ''}`.trim()
          : 'Usuario',
        claimantSlug: p?.slug,
        status: c.status,
        verificationNotes: c.verificationNotes,
        createdAt: c.createdAt,
      };
    });
  }

  async approveAdministrationRequest(claimId: string) {
    const claim = await this.claimRepo.findOne({ where: { id: claimId } });
    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.status !== ChurchClaimStatus.PENDING)
      throw new BadRequestException('Claim is not pending');

    claim.status = ChurchClaimStatus.APPROVED;
    claim.verifiedAt = new Date();
    await this.claimRepo.save(claim);

    await this.lifecycleService.transitionState(claim.churchId);

    // Update ChurchPublicProfile currentAdminPersonId
    const profile = await this.profileRepo.findOne({
      where: { churchId: claim.churchId },
      relations: ['church'],
    });

    if (profile) {
      profile.isCurrentAdmin = true;
      if (!profile.claimerPersonId)
        profile.claimerPersonId = claim.claimantPersonId;
      await this.profileRepo.save(profile);
    }
    return { success: true };
  }

  async rejectAdministrationRequest(claimId: string, notes?: string) {
    const claim = await this.claimRepo.findOne({ where: { id: claimId } });
    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.status !== ChurchClaimStatus.PENDING)
      throw new BadRequestException('Claim is not pending');

    claim.status = ChurchClaimStatus.REJECTED;
    if (notes) claim.verificationNotes = notes;
    await this.claimRepo.save(claim);
    return { success: true };
  }
}
