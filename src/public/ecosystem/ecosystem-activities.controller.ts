import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { EcosystemActivitiesService } from './services/ecosystem-activities.service';
import { GetEcosystemActivitiesDto } from './dto/get-ecosystem-activities.dto';
import { EcosystemActivity } from './entities/ecosystem-activity.entity';
import { EcosystemActivityEntityType } from './enums/ecosystem.enums';

@ApiTags('Public - Ecosystem Activities')
@Controller('public/ecosystem/activities')
export class EcosystemActivitiesController {
  constructor(private readonly activitiesService: EcosystemActivitiesService) {}

  @Get()
  @ApiOperation({ summary: 'Get global ecosystem activity feed' })
  async getGlobalFeed(@Query() query: GetEcosystemActivitiesDto) {
    const activities = await this.activitiesService.getActivities(query);
    return activities.map(this.mapToResponse);
  }

  @Get('location')
  @ApiOperation({ summary: 'Get geographical ecosystem activity feed' })
  async getGeographicalFeed(@Query() query: GetEcosystemActivitiesDto) {
    const activities = await this.activitiesService.getActivities(query);
    return activities.map(this.mapToResponse);
  }

  @Get('person/:personId')
  @ApiOperation({ summary: 'Get personal ecosystem activity feed' })
  async getPersonalFeed(
    @Param('personId') personId: string,
    @Query() query: GetEcosystemActivitiesDto,
  ) {
    query.personId = personId;
    const activities = await this.activitiesService.getActivities(query);
    return activities.map(this.mapToResponse);
  }

  @Get('church/:churchId')
  @ApiOperation({ summary: 'Get church ecosystem activity feed' })
  async getChurchFeed(
    @Param('churchId') churchId: string,
    @Query() query: GetEcosystemActivitiesDto,
  ) {
    query.churchId = churchId;
    const activities = await this.activitiesService.getActivities(query);
    return activities.map(this.mapToResponse);
  }

  @Get('missions')
  @ApiOperation({ summary: 'Get missionary ecosystem activity feed' })
  async getMissionaryFeed(@Query() query: GetEcosystemActivitiesDto) {
    query.entityTypes = [
      EcosystemActivityEntityType.MISSION_PROJECT,
      EcosystemActivityEntityType.UNREACHED_AREA,
      EcosystemActivityEntityType.CHURCH_NEED_SIGNAL,
      EcosystemActivityEntityType.NEED_SIGNAL,
      EcosystemActivityEntityType.MISSION_COLLABORATION,
    ];
    const activities = await this.activitiesService.getActivities(query);
    return activities.map(this.mapToResponse);
  }

  private mapToResponse(activity: EcosystemActivity) {
    return {
      id: activity.id,
      activityType: activity.activityType,
      createdAt: activity.createdAt,
      location: {
        country: activity.country,
        state: activity.state,
        city: activity.city,
      },
      metadata: activity.metadata,
      actorPerson: activity.actorPerson
        ? {
            id: activity.actorPerson.id,
            firstName: activity.actorPerson.firstName,
            lastName: activity.actorPerson.lastName,
            avatarUrl: activity.actorPerson.avatarUrl,
            slug: activity.actorPerson.slug,
            isPublicProfileEnabled: activity.actorPerson.isPublicProfileEnabled,
          }
        : null,
      actorChurch: activity.actorChurch
        ? {
            id: activity.actorChurch.id,
            name: activity.actorChurch.canonicalName,
            slug: activity.actorChurch.publicProfile?.slug,
            logoUrl: activity.actorChurch.publicProfile?.logoUrl,
            coverUrl: activity.actorChurch.publicProfile?.coverUrl,
            city: activity.actorChurch.publicProfile?.city,
            state: activity.actorChurch.publicProfile?.state,
          }
        : null,
      relatedChurch: activity.relatedChurch
        ? {
            id: activity.relatedChurch.id,
            name: activity.relatedChurch.canonicalName,
            slug: activity.relatedChurch.publicProfile?.slug,
            logoUrl: activity.relatedChurch.publicProfile?.logoUrl,
            coverUrl: activity.relatedChurch.publicProfile?.coverUrl,
            city: activity.relatedChurch.publicProfile?.city,
            state: activity.relatedChurch.publicProfile?.state,
          }
        : null,
      targetEntity: {
        id: activity.entityId,
        type: activity.entityType,
        liveStatus: activity.liveEntityStatus,
        liveCloseReason: (activity as any).liveEntityCloseReason,
        isHistorical: activity.isHistorical,
        // Since we don't eager load every possible polymorphic target entity,
        // the frontend will use this reference. If we wanted to enrich further,
        // we would need a dedicated resolver or data loader here.
      },
    };
  }
}
