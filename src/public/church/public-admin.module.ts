import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicServiceSchedule } from './entities/public-service-schedule.entity';
import { Church } from '../../core/churches/entities/church.entity';
import { ChurchPublicAdminController } from './controllers/church-public-admin.controller';
import { ChurchPublicAdminService } from './services/church-public-admin.service';
import { ChurchOwnershipService } from './services/church-ownership.service';
import { ManagePublicRelationUseCase } from './use-cases/manage-public-relation.use-case';
import { UpdatePublicChurchProfileUseCase } from './use-cases/update-public-church-profile.use-case';

import { EcosystemContributionsModule } from '../ecosystem/ecosystem-contributions.module';
import { EcosystemActivitiesModule } from '../ecosystem/ecosystem-activities.module';
import { ChurchPublicProfile } from './entities/church_public_profile.entity';
import { PublicChurchRelation } from './entities/public_church_relation.entity';
import { ChurchClaim } from './entities/church_claim.entity';
import { EcosystemHistory } from '../ecosystem/entities/ecosystem-history.entity';
import { ChurchDoctrinalIdentity } from './entities/church-doctrinal-identity.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChurchPublicProfile, PublicChurchRelation, Church, ChurchClaim, EcosystemHistory, ChurchDoctrinalIdentity, PublicServiceSchedule]),
    EcosystemContributionsModule,
    EcosystemActivitiesModule
  ],
  controllers: [ChurchPublicAdminController],
  providers: [
    ChurchPublicAdminService,
    ChurchOwnershipService,
    ManagePublicRelationUseCase,
    UpdatePublicChurchProfileUseCase,
  ],
  exports: [ChurchPublicAdminService, ChurchOwnershipService],
})
export class PublicAdminModule { }
