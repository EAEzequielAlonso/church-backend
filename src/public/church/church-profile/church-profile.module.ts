import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChurchProfileController } from './church-profile.controller';
import { ChurchProfileService } from './services/church-profile.service';
import { ChurchLifecycleService } from './services/church-lifecycle.service';
import { EcosystemContributionsModule } from 'src/public/ecosystem/ecosystem-contributions.module';
import { ChurchPublicProfile } from '../entities/church_public_profile.entity';
import { PublicChurchRelation } from '../entities/public_church_relation.entity';
import { ChurchClaim } from '../entities/church_claim.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChurchPublicProfile, PublicChurchRelation, ChurchClaim]),
    EcosystemContributionsModule,
  ],
  controllers: [ChurchProfileController],
  providers: [ChurchProfileService, ChurchLifecycleService],
  exports: [ChurchProfileService, ChurchLifecycleService],
})
export class ChurchProfileModule {}
