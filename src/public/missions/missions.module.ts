import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MissionProject } from './entities/mission-project.entity';
import { MissionCollaboration } from './entities/mission-collaboration.entity';
import { MissionNeed } from './entities/mission-need.entity';
import { MissionReport } from './entities/mission-report.entity';
import { MissionStatePolicy } from './policies/mission-state.policy';
import { MissionPermissions } from './policies/mission.permissions';
import { MissionRules } from './policies/mission.rules';
import { MissionNeedsEvaluator } from './policies/mission-needs.evaluator';
import { MissionReportsEvaluator } from './policies/mission-reports.evaluator';
import { MissionCollaborationsEvaluator } from './policies/mission-collaborations.evaluator';
import { MissionProjectEvaluator } from './policies/mission-project.evaluator';
import { MissionsService } from './services/missions.service';
import { MissionNeedsService } from './services/mission-needs.service';
import { MissionCollaborationsService } from './services/mission-collaborations.service';
import { MissionReportsService } from './services/mission-reports.service';
import { MissionsController } from './controllers/missions.controller';
import { MissionsManagementController } from './controllers/missions-management.controller';

import { Church } from '../../core/churches/entities/church.entity';

import { ChurchPublicProfile } from '../church/entities/church_public_profile.entity';
import { EcosystemActivitiesModule } from '../ecosystem/ecosystem-activities.module';
import { ChurchOwnershipService } from '../church/services/church-ownership.service';
import { ChurchClaim } from '../church/entities/church_claim.entity';
import { PublicChurchRelation } from '../church/entities/public_church_relation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MissionProject,
      MissionCollaboration,
      MissionNeed,
      MissionReport,
      Church,

      ChurchPublicProfile,
      ChurchClaim,
      PublicChurchRelation,
    ]),
    EcosystemActivitiesModule,
  ],
  controllers: [MissionsController, MissionsManagementController],
  providers: [
    MissionStatePolicy,
    MissionPermissions,
    MissionNeedsEvaluator,
    MissionReportsEvaluator,
    MissionCollaborationsEvaluator,
    MissionProjectEvaluator,
    MissionRules,
    MissionsService,
    MissionNeedsService,
    MissionCollaborationsService,
    MissionReportsService,
    ChurchOwnershipService,
  ],
  exports: [MissionsService],
})
export class MissionsModule {}
