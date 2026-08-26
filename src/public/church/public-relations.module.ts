import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Church } from '../../core/churches/entities/church.entity';
import { PublicChurchRelation } from './entities/public_church_relation.entity';
import { EcosystemHistory } from '../ecosystem/entities/ecosystem-history.entity';
import { PublicRelationsController } from './controllers/public-relations.controller';
import { PublicRelationsService } from './services/public-relations.service';
import { EcosystemContributionsModule } from '../ecosystem/ecosystem-contributions.module';
import { ChurchOwnershipService } from './services/church-ownership.service';
import { ChurchClaimsModule } from './church-claims.module';
import { EcosystemActivitiesModule } from '../ecosystem/ecosystem-activities.module';
import { ChurchInvitationListener } from './listeners/church-invitation.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([PublicChurchRelation, Church, EcosystemHistory]),
    EcosystemContributionsModule,
    forwardRef(() => ChurchClaimsModule),
    EcosystemActivitiesModule,
  ],
  controllers: [PublicRelationsController],
  providers: [
    PublicRelationsService,
    ChurchOwnershipService,
    ChurchInvitationListener,
  ],
  exports: [PublicRelationsService],
})
export class PublicRelationsModule {}
