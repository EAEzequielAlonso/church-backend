import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChurchProfileController } from './church-profile.controller';
import { ChurchProfileService } from './services/church-profile.service';
import { ChurchLifecycleService } from './services/church-lifecycle.service';
import { EcosystemContributionsModule } from 'src/public/ecosystem/ecosystem-contributions.module';
import { ChurchPublicProfile } from '../entities/church_public_profile.entity';
import { PublicChurchRelation } from '../entities/public_church_relation.entity';
import { ChurchClaim } from '../entities/church_claim.entity';
import { ChurchFollow } from '../entities/follower.entity';
import { FollowersController } from './followers.controller';
import { FollowersService } from './services/followers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChurchPublicProfile,
      PublicChurchRelation,
      ChurchClaim,
      ChurchFollow,
    ]),
    EcosystemContributionsModule,
  ],
  controllers: [ChurchProfileController, FollowersController],
  providers: [ChurchProfileService, ChurchLifecycleService, FollowersService],
  exports: [ChurchProfileService, ChurchLifecycleService, FollowersService],
})
export class ChurchProfileModule {}
