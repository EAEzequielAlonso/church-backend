import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Church } from '../../../../core/churches/entities/church.entity';
import { ChurchPublicProfile } from 'src/public/church/entities/church_public_profile.entity';
import { PublicServiceSchedule } from '../../entities/public-service-schedule.entity';
import { CreatePublicChurchDto } from '../dto/create-public-church.dto';
import { ChurchSlugService } from '../services/church-slug.service';
import { EcosystemContributionsService } from '../../../ecosystem/services/ecosystem-contributions.service';
import { EcosystemActivitiesService } from '../../../ecosystem/services/ecosystem-activities.service';
import { EcosystemContributionType, GeoPrecision, EcosystemActivityType, EcosystemActivityEntityType } from '../../../ecosystem/enums/ecosystem.enums';
import { GeoNormalizationUtil } from '../../../ecosystem/geo/utils/geo-normalization.util';

@Injectable()
export class CreatePublicChurchUseCase {
  constructor(
    private readonly dataSource: DataSource,
    private readonly slugService: ChurchSlugService,
    private readonly contributionsService: EcosystemContributionsService,
    private readonly activitiesService: EcosystemActivitiesService,
  ) { }

  async execute(dto: CreatePublicChurchDto, personId: string) {
    await this.slugService.detectDuplicate(dto.name, dto.city);
    const slug = await this.slugService.generateSlug(dto.name);

    return this.dataSource.transaction(async (manager) => {
      const church = manager.create(Church, {
        canonicalName: dto.name.trim(),
      });
      await manager.save(church);

      const profile = manager.create(ChurchPublicProfile, {
        churchId: church.id,
        slug: slug,
        creatorPersonId: personId,
        isVerified: false,
        publicDescription: dto.publicDescription,
        country: GeoNormalizationUtil.normalizeString(dto.country) || dto.country.trim(),
        state: GeoNormalizationUtil.normalizeString(dto.state) || dto.state.trim(),
        city: GeoNormalizationUtil.normalizeString(dto.city) || dto.city.trim(),
        address: dto.address.trim(),
        postalCode: dto.postalCode,
        latitude: dto.latitude,
        longitude: dto.longitude,
        geoPrecision: dto.geoPrecision ?? GeoPrecision.EXACT,
        website: dto.website,
        instagram: dto.instagram,
        facebook: dto.facebook,
        logoUrl: dto.logoUrl,
        coverUrl: dto.coverUrl,
        mainImageUrl: dto.mainImageUrl,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        denomination: dto.denomination,
      });
      await manager.save(profile);

      const meetings = (dto.meetings ?? [])
        .filter((meeting) => meeting.dayOfWeek && meeting.title.trim() && meeting.startTime.trim())
        .map((meeting) =>
          manager.create(PublicServiceSchedule, {
            profileId: profile.id,
            title: meeting.title.trim(),
            dayOfWeek: meeting.dayOfWeek,
            startTime: meeting.startTime.trim(),
            isPubliclyVisible: true,
          }),
        );

      if (meetings.length > 0) {
        await manager.save(PublicServiceSchedule, meetings);
      }

      await this.contributionsService.recordContribution({
        actorPersonId: personId,
        targetChurchId: church.id,
        type: EcosystemContributionType.CHURCH_ADDED,
        metadata: {
          churchName: church.canonicalName,
          geoCity: GeoNormalizationUtil.normalizeString(dto.city) || dto.city.trim(),
          geoState: GeoNormalizationUtil.normalizeString(dto.state) || dto.state.trim(),
          geoCountry: GeoNormalizationUtil.normalizeString(dto.country) || dto.country.trim(),
          source: 'network_directory_form',
        },
        manager,
      });

      await this.activitiesService.logActivity({
        actorPersonId: personId,
        relatedChurchId: church.id,
        activityType: EcosystemActivityType.CHURCH_ADDED,
        entityId: church.id,
        entityType: EcosystemActivityEntityType.CHURCH,
        country: profile.country,
        state: profile.state,
        city: profile.city,
        metadata: {
          meetingsCount: meetings.length,
        },
      }, manager);

      return {
        message: 'Church added to the public network successfully.',
        slug: slug,
      };
    });
  }
}
