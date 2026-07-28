import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChurchPublicProfile } from '../../entities/church_public_profile.entity';
import { ChurchFollow } from '../../entities/follower.entity';

@Injectable()
export class FollowersService {
  constructor(
    @InjectRepository(ChurchPublicProfile)
    private readonly profiles: Repository<ChurchPublicProfile>,
    @InjectRepository(ChurchFollow)
    private readonly follows: Repository<ChurchFollow>,
  ) {}

  async follow(churchId: string, personId: string) {
    const profile = await this.profiles.findOne({ where: { churchId } });
    if (!profile) throw new NotFoundException('Church profile not found');

    const existing = await this.follows.findOne({
      where: { profileChurchId: profile.id, personId },
    });
    if (existing) throw new BadRequestException('Already following');

    const follow = this.follows.create({
      profileChurchId: profile.id,
      personId,
    });
    await this.follows.save(follow);
    return { followed: true };
  }

  async unfollow(churchId: string, personId: string) {
    const profile = await this.profiles.findOne({ where: { churchId } });
    if (!profile) throw new NotFoundException('Church profile not found');

    const existing = await this.follows.findOne({
      where: { profileChurchId: profile.id, personId },
    });
    if (!existing) throw new NotFoundException('Not following');

    await this.follows.delete(existing.id);
    return { unfollowed: true };
  }
}
