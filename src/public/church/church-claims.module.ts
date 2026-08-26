import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Church } from '../../core/churches/entities/church.entity';
import { ChurchClaim } from './entities/church_claim.entity';
import { EcosystemHistory } from '../ecosystem/entities/ecosystem-history.entity';
import { ChurchClaimsController } from './controllers/church-claims.controller';
import { ChurchClaimsAdminController } from './controllers/church-claims-admin.controller';
import { ChurchClaimsService } from './services/church-claims.service';
import { SubmitChurchClaimUseCase } from './use-cases/church-claims/submit-church-claim.use-case';
import { ApproveChurchClaimUseCase } from './use-cases/church-claims/approve-church-claim.use-case';
import { RejectChurchClaimUseCase } from './use-cases/church-claims/reject-church-claim.use-case';
import { ChurchProfileModule } from './church-profile/church-profile.module';
import { EcosystemContributionsModule } from '../ecosystem/ecosystem-contributions.module';
import { EcosystemActivitiesModule } from '../ecosystem/ecosystem-activities.module';
import { ChurchPublicProfile } from './entities/church_public_profile.entity';
import { PublicChurchRelation } from './entities/public_church_relation.entity';
import { PublicRelationsModule } from './public-relations.module';
import { Person } from '../../core/users/entities/person.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChurchClaim,
      Church,
      ChurchPublicProfile,
      EcosystemHistory,
      PublicChurchRelation,
      Person,
    ]),
    ChurchProfileModule,
    EcosystemContributionsModule,
    EcosystemActivitiesModule,
    forwardRef(() => PublicRelationsModule),
  ],
  controllers: [ChurchClaimsController, ChurchClaimsAdminController],
  providers: [
    ChurchClaimsService,
    SubmitChurchClaimUseCase,
    ApproveChurchClaimUseCase,
    RejectChurchClaimUseCase,
  ],
  exports: [ChurchClaimsService, SubmitChurchClaimUseCase],
})
export class ChurchClaimsModule {}
