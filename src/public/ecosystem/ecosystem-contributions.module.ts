import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EcosystemContribution } from '../ecosystem/entities/ecosystem-contribution.entity';
import { PublicChurchRelation } from '../church/entities/public_church_relation.entity';
import { EcosystemContributionsService } from '../ecosystem/services/ecosystem-contributions.service';
import { EcosystemFeedController } from './ecosystem-feed.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EcosystemContribution, PublicChurchRelation])],
  controllers: [EcosystemFeedController],
  providers: [EcosystemContributionsService],
  exports: [EcosystemContributionsService],
})
export class EcosystemContributionsModule { }
