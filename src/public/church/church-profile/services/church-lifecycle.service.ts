import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { ChurchPublicProfile } from 'src/public/church/entities/church_public_profile.entity';

@Injectable()
export class ChurchLifecycleService {
  constructor(
    @InjectRepository(ChurchPublicProfile)
    private readonly profiles: Repository<ChurchPublicProfile>,
  ) {}

  /**
   * Centralized transition for the lifecycle state of a public church profile.
   */
  async transitionState(
    churchId: string,
    manager?: EntityManager,
  ): Promise<ChurchPublicProfile> {
    const repo = manager
      ? manager.getRepository(ChurchPublicProfile)
      : this.profiles;
    const profile = await repo.findOne({ where: { churchId } });

    if (!profile) {
      throw new NotFoundException(
        `Public profile not found for church ${churchId}`,
      );
    }
    if (!profile.isVerified) {
      throw new NotFoundException(`La Iglesia ya fue verificada`);
    }
    profile.isVerified = true;

    return repo.save(profile);
  }
}
