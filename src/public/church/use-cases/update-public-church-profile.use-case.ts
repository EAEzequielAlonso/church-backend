import { NotFoundException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublicServiceSchedule } from '../entities/public-service-schedule.entity';
import { Church } from '../../../core/churches/entities/church.entity';
import { UpdatePublicChurchProfileDto } from '../dto/update-public-church-profile.dto';
import { ChurchOwnershipService } from '../services/church-ownership.service';
import { ChurchPublicProfile } from '../entities/church_public_profile.entity';
import { ChurchDoctrinalIdentity } from '../entities/church-doctrinal-identity.entity';

@Injectable()
export class UpdatePublicChurchProfileUseCase {
  constructor(
    @InjectRepository(ChurchPublicProfile) private readonly profiles: Repository<ChurchPublicProfile>,
    @InjectRepository(Church) private readonly churches: Repository<Church>,
    @InjectRepository(ChurchDoctrinalIdentity) private readonly doctrinals: Repository<ChurchDoctrinalIdentity>,
    @InjectRepository(PublicServiceSchedule) private readonly schedules: Repository<PublicServiceSchedule>,
    private readonly ownership: ChurchOwnershipService,
  ) { }

  async execute(personId: string, churchId: string, dto: UpdatePublicChurchProfileDto) {
    await this.ownership.assertOwnsChurch(personId, churchId);

    const profile = await this.profiles.findOne({ where: { churchId }, relations: ['church'] });
    if (!profile) throw new NotFoundException('Public profile not found');

    if (dto.publicDescription !== undefined) profile.publicDescription = dto.publicDescription;
    if (dto.photoUrls !== undefined) profile.photoUrls = dto.photoUrls;

    if (dto.address !== undefined) profile.address = dto.address;
    if (dto.city !== undefined) profile.city = dto.city;
    if (dto.state !== undefined) profile.state = dto.state;
    if (dto.country !== undefined) profile.country = dto.country;

    // Social & Web Links
    if (dto.website !== undefined) profile.website = dto.website;
    if (dto.instagram !== undefined) profile.instagram = dto.instagram;
    if (dto.facebook !== undefined) profile.facebook = dto.facebook;
    if (dto.youtube !== undefined) profile.youtube = dto.youtube;

    // Contact & Identity
    if (dto.contactEmail !== undefined) profile.contactEmail = dto.contactEmail;
    if (dto.contactPhone !== undefined) profile.contactPhone = dto.contactPhone;
    if (dto.logoUrl !== undefined) profile.logoUrl = dto.logoUrl;
    if (dto.coverUrl !== undefined) profile.coverUrl = dto.coverUrl;
    if (dto.mainImageUrl !== undefined) profile.mainImageUrl = dto.mainImageUrl;

    if (dto.denomination !== undefined) profile.denomination = dto.denomination;

    const saved = await this.profiles.save(profile);

    if (dto.meetings !== undefined) {
      await this.schedules.delete({ profileId: profile.id });
      if (dto.meetings.length > 0) {
        const newSchedules = dto.meetings.map(m => this.schedules.create({
          profileId: profile.id,
          title: m.title,
          dayOfWeek: m.dayOfWeek,
          startTime: m.startTime,
        }));
        await this.schedules.save(newSchedules);
      }
    }

    if (dto.doctrinalIdentity !== undefined) {
      let doc = await this.doctrinals.findOne({ where: { profileId: profile.id } });
      if (!doc) {
        doc = this.doctrinals.create({ profileId: profile.id });
      }
      Object.assign(doc, dto.doctrinalIdentity);
      await this.doctrinals.save(doc);
    }

    return {
      churchId: saved.churchId,
      isVerified: saved.isVerified,
      publicDescription: saved.publicDescription ?? null,
      doctrinalTags: [], // Taxonomy
      serviceTimes: {}, // PublicServiceSchedule
      socialLinks: {
        website: saved.website,
        instagram: saved.instagram,
        facebook: saved.facebook,
        youtube: saved.youtube,
      },
      updatedAt: saved.updatedAt
    };
  }
}
