import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { EcosystemActivityEntityType } from '../enums/ecosystem.enums';
import { EcosystemActivity } from '../entities/ecosystem-activity.entity';
import { LogEcosystemActivityDto } from '../dto/log-ecosystem-activity.dto';
import { GetEcosystemActivitiesDto } from '../dto/get-ecosystem-activities.dto';
import { EcosystemHydrationRegistry } from './hydration/ecosystem-hydration.registry';

@Injectable()
export class EcosystemActivitiesService {
  private readonly logger = new Logger(EcosystemActivitiesService.name);

  constructor(
    @InjectRepository(EcosystemActivity)
    private readonly activityRepository: Repository<EcosystemActivity>,
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

  async getActivities(
    queryDto: GetEcosystemActivitiesDto,
  ): Promise<EcosystemActivity[]> {
    const {
      limit = 20,
      offset = 0,
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
      );
    // Note: We NO LONGER join `relatedChurch` or other target entities here.
    // This allows the feed to scale to 40+ event types without 40+ JOINs.

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

    query.orderBy('activity.createdAt', 'DESC');
    query.take(limit);
    query.skip(offset);

    const activities = await query.getMany();

    // Batch Hydration: Delegate to the specific entity hydrators
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
