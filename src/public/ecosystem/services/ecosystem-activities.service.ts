import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, Brackets, SelectQueryBuilder } from 'typeorm';
import { EcosystemActivityEntityType } from '../enums/ecosystem.enums';
import { EcosystemActivity } from '../entities/ecosystem-activity.entity';
import { LogEcosystemActivityDto } from '../dto/log-ecosystem-activity.dto';
import { GetEcosystemActivitiesDto } from '../dto/get-ecosystem-activities.dto';
import { EcosystemHydrationRegistry } from './hydration/ecosystem-hydration.registry';
import { Person } from '../../../core/users/entities/person.entity';
import { ChurchFollow } from '../../church/entities/follower.entity';

@Injectable()
export class EcosystemActivitiesService {
  private readonly logger = new Logger(EcosystemActivitiesService.name);

  constructor(
    @InjectRepository(EcosystemActivity)
    private readonly activityRepository: Repository<EcosystemActivity>,
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(ChurchFollow)
    private readonly churchFollowRepository: Repository<ChurchFollow>,
    private readonly hydrationRegistry: EcosystemHydrationRegistry,
  ) {}

  async logActivity(
    dto: LogEcosystemActivityDto,
    manager?: EntityManager,
  ): Promise<EcosystemActivity> {
    try {
      const repo = manager
        ? manager.getRepository(EcosystemActivity)
        : this.activityRepository;
      const activity = repo.create(dto);
      return await repo.save(activity);
    } catch (error) {
      this.logger.error(
        `Failed to log ecosystem activity: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private buildBaseQuery(
    queryDto: GetEcosystemActivitiesDto,
  ): SelectQueryBuilder<EcosystemActivity> {
    const {
      country,
      state,
      city,
      personId,
      churchId,
      activityTypes,
      entityTypes,
    } = queryDto;

    const query = this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.actorPerson', 'actorPerson')
      .leftJoinAndSelect('activity.actorChurch', 'actorChurch')
      .leftJoinAndSelect(
        'actorChurch.publicProfile',
        'actorChurchPublicProfile',
      )
      .leftJoinAndSelect('activity.relatedChurch', 'relatedChurch')
      .leftJoinAndSelect(
        'relatedChurch.publicProfile',
        'relatedChurchPublicProfile',
      );

    if (country) query.andWhere('activity.country = :country', { country });
    if (state) query.andWhere('activity.state = :state', { state });
    if (city) query.andWhere('activity.city = :city', { city });

    if (personId) {
      query.andWhere('activity.actorPersonId = :personId', { personId });
    }

    if (churchId) {
      query.andWhere(
        '(activity.actorChurchId = :churchId OR activity.relatedChurchId = :churchId OR (activity.entityType = :churchEntityType AND activity.entityId = :churchId))',
        { churchId, churchEntityType: 'CHURCH' },
      );
    }

    if (activityTypes && activityTypes.length > 0) {
      query.andWhere('activity.activityType IN (:...activityTypes)', {
        activityTypes,
      });
    }

    if (entityTypes && entityTypes.length > 0) {
      query.andWhere('activity.entityType IN (:...entityTypes)', {
        entityTypes,
      });
    }

    return query;
  }

  async getActivities(
    queryDto: GetEcosystemActivitiesDto,
  ): Promise<EcosystemActivity[]> {
    const { limit = 20, offset = 0 } = queryDto;
    const query = this.buildBaseQuery(queryDto);

    query.orderBy('activity.createdAt', 'DESC');
    query.take(limit);
    query.skip(offset);

    const activities = await query.getMany();
    await this.hydrationRegistry.hydrateActivities(activities);
    return activities;
  }

  async getPersonalizedActivities(
    userId: string,
    queryDto: GetEcosystemActivitiesDto,
  ): Promise<EcosystemActivity[]> {
    const { limit = 20, offset = 0 } = queryDto;

    // 1. Get User Context
    const person = await this.personRepository.findOne({
      where: { id: userId },
      select: ['id', 'city', 'state', 'country'],
    });

    const follows = await this.churchFollowRepository.find({
      where: { personId: userId },
      select: ['profileChurchId'],
    });
    
    const followedChurchIds = follows.map((f) => f.profileChurchId);

    const hasContext = (person?.city || person?.state || person?.country || followedChurchIds.length > 0);

    // Stable Fallback: If no location and no follows, they have 0 context. Use global.
    if (!hasContext) {
      return this.getActivities(queryDto); 
    }

    // 2. Build Candidates Query with Relevance Tiers
    const query = this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.actorPerson', 'actorPerson')
      .leftJoinAndSelect('activity.actorChurch', 'actorChurch')
      .leftJoinAndSelect(
        'actorChurch.publicProfile',
        'actorChurchPublicProfile',
      )
      .leftJoinAndSelect('activity.relatedChurch', 'relatedChurch')
      .leftJoinAndSelect(
        'relatedChurch.publicProfile',
        'relatedChurchPublicProfile',
      );

    const conditions = [];
    const parameters: any = { userId };

    // TIER 1: Direct Relation (Own activity, or followed church)
    conditions.push('activity.actorPersonId = :userId');

    if (followedChurchIds.length > 0) {
      conditions.push('activity.actorChurchId IN (:...followedChurchIds)');
      conditions.push('activity.relatedChurchId IN (:...followedChurchIds)');
      // For polymorphic entity where the church is the target
      conditions.push(
        '(activity.entityType = :churchType AND activity.entityId IN (:...followedChurchIds))',
      );
      parameters.followedChurchIds = followedChurchIds;
      parameters.churchType = EcosystemActivityEntityType.CHURCH;
    }

    // TIER 2 & 3: Local Context & Discovery
    if (person.city) {
      conditions.push('activity.city = :userCity');
      parameters.userCity = person.city;
    }
    
    if (person.state) {
      conditions.push('activity.state = :userState');
      parameters.userState = person.state;
    }

    if (person.country) {
      conditions.push('activity.country = :userCountry');
      parameters.userCountry = person.country;
    }

    // Apply conditions
    if (conditions.length > 0) {
      query.where(new Brackets((qb) => {
        conditions.forEach((condition, index) => {
          if (index === 0) qb.where(condition, parameters);
          else qb.orWhere(condition, parameters);
        });
      }));
    }

    // Compute Relevance Tier dynamically
    let caseStatement = 'CASE ';
    // Tier 1: Relational
    caseStatement += 'WHEN activity.actor_person_id = :userId THEN 1 ';
    if (followedChurchIds.length > 0) {
      caseStatement += 'WHEN activity.actor_church_id IN (:...followedChurchIds) THEN 1 ';
      caseStatement += 'WHEN activity.related_church_id IN (:...followedChurchIds) THEN 1 ';
      caseStatement += `WHEN activity.entity_type = '${EcosystemActivityEntityType.CHURCH}' AND activity.entity_id IN (:...followedChurchIds) THEN 1 `;
    }
    // Tier 2: City
    if (person.city) {
      caseStatement += 'WHEN activity.city = :userCity THEN 2 ';
    }
    // Tier 3: State
    if (person.state) {
      caseStatement += 'WHEN activity.state = :userState THEN 3 ';
    }
    // Tier 4: Country (Global Fallback within same country)
    if (person.country) {
      caseStatement += 'WHEN activity.country = :userCountry THEN 4 ';
    }
    caseStatement += 'ELSE 5 END';

    query.addSelect(caseStatement, 'relevance_tier');

    // Check if the personalized pool is completely empty before paginating
    const totalPersonalized = await query.getCount();
    if (totalPersonalized === 0) {
      // Stable fallback for all pages if there are no candidates in the user's area
      return this.getActivities(queryDto);
    }

    // 4. Order & Paginate
    query.orderBy('relevance_tier', 'ASC');
    query.addOrderBy('activity.createdAt', 'DESC');
    query.addOrderBy('activity.id', 'DESC'); // Tiebreaker for deterministic pagination
    query.take(limit);
    query.skip(offset);

    const activities = await query.getMany();
    
    await this.hydrationRegistry.hydrateActivities(activities);
    return activities;
  }

  async getMissionActivities(
    missionId: string,
    queryDto: GetEcosystemActivitiesDto,
  ): Promise<EcosystemActivity[]> {
    const { limit = 20, offset = 0 } = queryDto;
    const query = this.buildBaseQuery(queryDto);

    query.andWhere(
      new Brackets((qb) => {
        qb.where(
          'activity.entityType = :missionProjectType AND activity.entityId = :missionId',
          {
            missionProjectType: EcosystemActivityEntityType.MISSION_PROJECT,
            missionId,
          },
        ).orWhere(
          "activity.entityType IN (:...relatedTypes) AND activity.metadata->>'missionProjectId' = :missionIdText",
          {
            relatedTypes: [
              EcosystemActivityEntityType.MISSION_NEED,
              EcosystemActivityEntityType.MISSION_COLLABORATION,
              EcosystemActivityEntityType.MISSION_REPORT,
            ],
            missionIdText: String(missionId),
          },
        );
      }),
    );

    query.orderBy('activity.createdAt', 'DESC');
    query.take(limit);
    query.skip(offset);

    const activities = await query.getMany();
    await this.hydrationRegistry.hydrateActivities(activities);
    return activities;
  }

  async deleteActivitiesByEntity(
    entityType: EcosystemActivityEntityType,
    entityId: string,
  ): Promise<void> {
    await this.activityRepository.delete({
      entityType,
      entityId,
    });
  }
}
