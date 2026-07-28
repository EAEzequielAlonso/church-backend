import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, In } from 'typeorm';
import { EcosystemContribution } from '../entities/ecosystem-contribution.entity';
import { PublicChurchRelation } from 'src/public/church/entities/public_church_relation.entity';
import { EcosystemContributionType } from '../enums/ecosystem.enums';
import {
  PublicChurchRelationStatus,
  PublicChurchRelationType,
} from '../../enums/public.enums';

export interface RecordContributionParams {
  actorPersonId: string;
  targetChurchId: string;
  type: EcosystemContributionType;
  metadata?: Record<string, any>;
  manager?: EntityManager;
}

export interface VisibleContributions {
  churchesAdded: number;
  doctrinalOpinions: number;
  needSignalsCreated: number;
  unreachedAreasCreated: number;
  needInformationAdded: number;
  invitationsCompleted: number;
}

@Injectable()
export class EcosystemContributionsService {
  constructor(
    @InjectRepository(EcosystemContribution)
    private readonly repo: Repository<EcosystemContribution>,
    @InjectRepository(PublicChurchRelation)
    private readonly relationsRepo: Repository<PublicChurchRelation>,
  ) {}

  /**
   * Append-oriented event recording for ecosystem contributions.
   * Can accept a transaction manager if part of a broader transaction.
   */
  async recordContribution(
    params: RecordContributionParams,
  ): Promise<EcosystemContribution> {
    const manager = params.manager || this.repo.manager;

    const contribution = manager.create(EcosystemContribution, {
      actorPersonId: params.actorPersonId,
      targetChurchId: params.targetChurchId,
      type: params.type,
      metadata: params.metadata || {},
    });

    return manager.save(EcosystemContribution, contribution);
  }

  async getAggregatedContributionsForPerson(
    personId: string,
  ): Promise<VisibleContributions> {
    const counts = await this.repo
      .createQueryBuilder('c')
      .select('c.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('c.actorPersonId = :personId', { personId })
      .groupBy('c.type')
      .getRawMany();

    const map = new Map(counts.map((x) => [x.type, Number(x.count)]));

    return {
      churchesAdded: map.get(EcosystemContributionType.CHURCH_ADDED) ?? 0,
      doctrinalOpinions:
        map.get(EcosystemContributionType.DOCTRINAL_OPINION_SUBMITTED) ?? 0,
      needSignalsCreated:
        map.get(EcosystemContributionType.CHURCH_NEED_SIGNAL_CREATED) ?? 0,
      unreachedAreasCreated:
        map.get(EcosystemContributionType.UNREACHED_AREA_CREATED) ?? 0,
      needInformationAdded:
        map.get(EcosystemContributionType.NEED_INFORMATION_ADDED) ?? 0,
      invitationsCompleted:
        (map.get(EcosystemContributionType.USER_INVITED) ?? 0) +
        (map.get(EcosystemContributionType.CHURCH_ADMIN_INVITED) ?? 0) +
        (map.get(EcosystemContributionType.CHURCH_MEMBER_INVITED) ?? 0) +
        (map.get(EcosystemContributionType.NEED_SIGNAL_INVITED) ?? 0),
    };
  }

  async getAggregatedContributionsForChurch(
    churchId: string,
  ): Promise<VisibleContributions> {
    const members = await this.relationsRepo.find({
      select: ['personId'],
      where: {
        churchId,
        relationType: PublicChurchRelationType.COMMUNITY_MEMBER,
        status: PublicChurchRelationStatus.APPROVED,
      },
    });

    const memberIds = members.map((m) => m.personId).filter((id) => id != null);

    if (memberIds.length === 0) {
      return {
        churchesAdded: 0,
        doctrinalOpinions: 0,
        needSignalsCreated: 0,
        unreachedAreasCreated: 0,
        needInformationAdded: 0,
        invitationsCompleted: 0,
      };
    }

    const counts = await this.repo
      .createQueryBuilder('c')
      .select('c.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('c.actorPersonId IN (:...memberIds)', { memberIds })
      .groupBy('c.type')
      .getRawMany();

    const map = new Map(counts.map((x) => [x.type, Number(x.count)]));

    return {
      churchesAdded: map.get(EcosystemContributionType.CHURCH_ADDED) ?? 0,
      doctrinalOpinions:
        map.get(EcosystemContributionType.DOCTRINAL_OPINION_SUBMITTED) ?? 0,
      needSignalsCreated:
        map.get(EcosystemContributionType.CHURCH_NEED_SIGNAL_CREATED) ?? 0,
      unreachedAreasCreated:
        map.get(EcosystemContributionType.UNREACHED_AREA_CREATED) ?? 0,
      needInformationAdded:
        map.get(EcosystemContributionType.NEED_INFORMATION_ADDED) ?? 0,
      invitationsCompleted:
        (map.get(EcosystemContributionType.USER_INVITED) ?? 0) +
        (map.get(EcosystemContributionType.CHURCH_ADMIN_INVITED) ?? 0) +
        (map.get(EcosystemContributionType.CHURCH_MEMBER_INVITED) ?? 0) +
        (map.get(EcosystemContributionType.NEED_SIGNAL_INVITED) ?? 0),
    };
  }

  async getFeed(
    limit: number = 20,
    offset: number = 0,
    personId?: string,
    churchId?: string,
  ): Promise<EcosystemContribution[]> {
    const allowedTypes = Object.values(EcosystemContributionType);

    const qb = this.repo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.actorPerson', 'actor')
      .where('c.type IN (:...allowedTypes)', { allowedTypes })
      .orderBy('c.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    if (personId) {
      qb.andWhere('c.actorPersonId = :personId', { personId });
    }

    if (churchId) {
      qb.andWhere('c.targetChurchId = :churchId', { churchId });
    }

    return qb.getMany();
  }
}
