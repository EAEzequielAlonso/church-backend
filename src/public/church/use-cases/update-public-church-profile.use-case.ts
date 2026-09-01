import { NotFoundException, Injectable, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublicServiceSchedule } from '../entities/public-service-schedule.entity';
import { Church } from '../../../core/churches/entities/church.entity';
import { UpdatePublicChurchProfileDto } from '../dto/update-public-church-profile.dto';
import { ChurchOwnershipService } from '../services/church-ownership.service';
import { ChurchPublicProfile } from '../entities/church_public_profile.entity';
import { ChurchDoctrinalIdentity } from '../entities/church-doctrinal-identity.entity';
import { StorageService } from '../../../core/storage/storage.service';

@Injectable()
export class UpdatePublicChurchProfileUseCase {
  private readonly logger = new Logger(UpdatePublicChurchProfileUseCase.name);

  constructor(
    @InjectRepository(ChurchPublicProfile)
    private readonly profiles: Repository<ChurchPublicProfile>,
    @InjectRepository(Church) private readonly churches: Repository<Church>,
    @InjectRepository(ChurchDoctrinalIdentity)
    private readonly doctrinals: Repository<ChurchDoctrinalIdentity>,
    @InjectRepository(PublicServiceSchedule)
    private readonly schedules: Repository<PublicServiceSchedule>,
    private readonly ownership: ChurchOwnershipService,
    private readonly storageService: StorageService,
  ) {}

  async execute(
    personId: string,
    churchId: string,
    dto: UpdatePublicChurchProfileDto,
  ) {
    await this.ownership.assertOwnsChurch(personId, churchId);

    const profile = await this.profiles.findOne({
      where: { churchId },
      relations: ['church'],
    });
    if (!profile) throw new NotFoundException('Public profile not found');

    if (dto.publicDescription !== undefined)
      profile.publicDescription = dto.publicDescription;
    if (dto.photoUrls !== undefined) profile.photoUrls = dto.photoUrls;

    if (dto.address !== undefined) profile.address = dto.address;
    if (dto.city !== undefined) profile.city = dto.city;
    if (dto.state !== undefined) profile.state = dto.state;
    if (dto.country !== undefined) profile.country = dto.country;
    if (dto.postalCode !== undefined) profile.postalCode = dto.postalCode;
    if (dto.latitude !== undefined) profile.latitude = dto.latitude;
    if (dto.longitude !== undefined) profile.longitude = dto.longitude;
    if (dto.geoPrecision !== undefined && dto.geoPrecision !== null)
      profile.geoPrecision = dto.geoPrecision;

    // Social & Web Links
    if (dto.website !== undefined) profile.website = dto.website;
    if (dto.instagram !== undefined) profile.instagram = dto.instagram;
    if (dto.facebook !== undefined) profile.facebook = dto.facebook;
    if (dto.youtube !== undefined) profile.youtube = dto.youtube;

    // Contact & Identity
    if (dto.contactEmail !== undefined) profile.contactEmail = dto.contactEmail;
    if (dto.contactPhone !== undefined) profile.contactPhone = dto.contactPhone;
    
    let oldLogoUrl: string | null = null;
    let oldCoverUrl: string | null = null;
    let oldMainImageUrl: string | null = null;
    
    if (dto.logoUrl !== undefined && dto.logoUrl !== profile.logoUrl) {
      oldLogoUrl = profile.logoUrl;
      profile.logoUrl = dto.logoUrl;
    }
    if (dto.coverUrl !== undefined && dto.coverUrl !== profile.coverUrl) {
      oldCoverUrl = profile.coverUrl;
      profile.coverUrl = dto.coverUrl;
    }
    if (dto.mainImageUrl !== undefined && dto.mainImageUrl !== profile.mainImageUrl) {
      oldMainImageUrl = profile.mainImageUrl;
      profile.mainImageUrl = dto.mainImageUrl;
    }

    if (dto.denomination !== undefined) profile.denomination = dto.denomination;
    if (dto.isVerified !== undefined) profile.isVerified = dto.isVerified;
    
    if (dto.slug !== undefined) {
      if (dto.slug !== profile.slug && dto.slug !== null) {
        // verify uniqueness
        const existing = await this.profiles.findOne({ where: { slug: dto.slug } });
        if (existing && existing.churchId !== churchId) {
          throw new ConflictException('Slug ya está en uso por otra iglesia');
        }
      }
      profile.slug = dto.slug;
    }

    const saved = await this.profiles.save(profile);

    // Image Cleanup
    const deleteOldImage = async (oldUrl: string | null, context: string) => {
      if (oldUrl) {
        const oldKey = this.storageService.extractKeyFromUrl(oldUrl, context);
        if (oldKey) {
          this.storageService.deleteObject(oldKey).catch((err) => {
            this.logger.error(`Failed to delete old ${context} object from R2: ${oldKey}`, err.stack);
          });
        }
      }
    };

    await deleteOldImage(oldLogoUrl, 'logos');
    await deleteOldImage(oldCoverUrl, 'covers');
    await deleteOldImage(oldMainImageUrl, 'main-images');

    if (dto.meetings !== undefined) {
      await this.schedules.delete({ profileId: profile.id });
      if (dto.meetings.length > 0) {
        const newSchedules = dto.meetings.map((m) =>
          this.schedules.create({
            profileId: profile.id,
            title: m.title,
            dayOfWeek: m.dayOfWeek,
            startTime: m.startTime,
          }),
        );
        await this.schedules.save(newSchedules);
      }
    }

    if (dto.doctrinalIdentity !== undefined) {
      let doc = await this.doctrinals.findOne({
        where: { profileId: profile.id },
      });
      if (!doc) {
        doc = this.doctrinals.create({ profileId: profile.id });
      }
      Object.assign(doc, dto.doctrinalIdentity);
      await this.doctrinals.save(doc);
    }

    return {
      churchId: saved.churchId,
      isVerified: saved.isVerified,
      slug: saved.slug,
      publicDescription: saved.publicDescription ?? null,
      doctrinalTags: [], // Taxonomy
      serviceTimes: {}, // PublicServiceSchedule
      socialLinks: {
        website: saved.website,
        instagram: saved.instagram,
        facebook: saved.facebook,
        youtube: saved.youtube,
      },
      updatedAt: saved.updatedAt,
    };
  }
}
