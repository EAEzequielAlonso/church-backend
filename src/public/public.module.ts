import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EcosystemContribution } from './ecosystem/entities/ecosystem-contribution.entity';
import { Person } from '../core/users/entities/person.entity';
import { PublicPeopleController } from './ecosystem/public-people.controller';
import { ChurchDirectoryModule } from './church/church-directory/church-directory.module';
import { ChurchProfileModule } from './church/church-profile/church-profile.module';
import { ChurchClaimsModule } from './church/church-claims.module';
import { PublicRelationsModule } from './church/public-relations.module';
import { GeoModule } from './ecosystem/geo/geo.module';
import { PublicAdminModule } from './church/public-admin.module';
import { NeedSignalsController } from './need/controllers/need-signals.controller';
import { NeedSignalsService } from './need/services/need-signals.service';
import { GetMapAggregatedNeedSignalsUseCase } from './need/use-cases/get-map-aggregated-need-signals.use-case';
import { CreateOrUpdatePersonalNeedSignalUseCase } from './need/use-cases/create-or-update-personal-need-signal.use-case';
import { ClosePersonalNeedSignalUseCase } from './need/use-cases/close-personal-need-signal.use-case';
import { GetActivePersonalNeedSignalUseCase } from './need/use-cases/get-active-personal-need-signal.use-case';
import { RecordNeedSignalContactAttemptUseCase } from './need/use-cases/record-need-signal-contact-attempt.use-case';
import { AddNeedSignalInformationUseCase } from './need/use-cases/add-need-signal-information.use-case';
import { ListNeedSignalInformationUseCase } from './need/use-cases/list-need-signal-information.use-case';
import { GetNeedSignalMapSummaryUseCase } from './need/use-cases/get-need-signal-map-summary.use-case';
import { GetLocationPublicNeedSignalsUseCase } from './need/use-cases/get-location-public-need-signals.use-case';
import { ListReceivedContactRequestsUseCase } from './need/use-cases/list-received-contact-requests.use-case';
import { ListSentContactRequestsUseCase } from './need/use-cases/list-sent-contact-requests.use-case';
import { AcceptPersonalNeedSignalContactUseCase } from './need/use-cases/accept-personal-need-signal-contact.use-case';
import { RejectPersonalNeedSignalContactUseCase } from './need/use-cases/reject-personal-need-signal-contact.use-case';
import { GetNeedEngagementContactDetailsUseCase } from './need/use-cases/get-need-engagement-contact-details.use-case';
import { TerritorialModule } from './ecosystem/territorial/territorial.module';
import { ChurchPublicProfile } from './church/entities/church_public_profile.entity';
import { PublicChurchRelation } from './church/entities/public_church_relation.entity';
import { ChurchClaim } from './church/entities/church_claim.entity';
import { EcosystemHistory } from './ecosystem/entities/ecosystem-history.entity';
import { ChurchDoctrinalIdentity } from './church/entities/church-doctrinal-identity.entity';
import { NeedSignal } from './need/entities/need-signal.entity';
import { NeedLocation } from './need/entities/need-location.entity';
import { EcosystemContributionsModule } from './ecosystem/ecosystem-contributions.module';
import { InvitationsModule } from './ecosystem/invitations/invitations.module';
import { DoctrinalOpinionsModule } from './doctrinal-opinions/doctrinal-opinions.module';
import { ChurchNeedSignal } from './need/entities/church-need-signal.entity';
import { ChurchNeedSignalSupport } from './need/entities/church-need-signal-support.entity';
import { NeedInformation } from './need/entities/need-information.entity';
import { ChurchNeedSignalsController } from './need/controllers/church-need-signals.controller';
import { ChurchNeedSignalsService } from './need/services/church-need-signals.service';
import { EcosystemActivitiesModule } from './ecosystem/ecosystem-activities.module';
import { UnreachedArea } from './need/entities/unreached-area.entity';
import { UnreachedAreasService } from './need/services/unreached-areas.service';
import { UnreachedAreasController } from './need/controllers/unreached-areas.controller';
import { UnreachedAreasAdminController } from './need/controllers/unreached-areas-admin.controller';
import { MissionsModule } from './missions/missions.module';
import { SmallGroupsModule } from './small-groups/small-groups.module';
import { NeedEngagement } from './need/entities/need-engagement.entity';
import { ChurchNeedSignalsListener } from './need/listeners/church-need-signals.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChurchPublicProfile,
      PublicChurchRelation,
      ChurchClaim,
      EcosystemHistory,
      ChurchDoctrinalIdentity,
      EcosystemContribution,
      Person,
      NeedSignal,
      NeedLocation,
      ChurchNeedSignal,
      ChurchNeedSignalSupport,
      NeedInformation,
      UnreachedArea,
      NeedEngagement,
    ]),
    EcosystemContributionsModule,
    EcosystemActivitiesModule,
    ChurchDirectoryModule,
    ChurchProfileModule,
    ChurchClaimsModule,
    PublicRelationsModule,
    GeoModule,
    PublicAdminModule,
    TerritorialModule,
    InvitationsModule,
    DoctrinalOpinionsModule,
    MissionsModule,
    SmallGroupsModule,
  ],
  providers: [
    NeedSignalsService,
    ChurchNeedSignalsService,
    UnreachedAreasService,
    GetMapAggregatedNeedSignalsUseCase,
    CreateOrUpdatePersonalNeedSignalUseCase,
    ClosePersonalNeedSignalUseCase,
    GetActivePersonalNeedSignalUseCase,
    RecordNeedSignalContactAttemptUseCase,
    AddNeedSignalInformationUseCase,
    ListNeedSignalInformationUseCase,
    GetNeedSignalMapSummaryUseCase,
    GetLocationPublicNeedSignalsUseCase,
    ListReceivedContactRequestsUseCase,
    ListSentContactRequestsUseCase,
    AcceptPersonalNeedSignalContactUseCase,
    RejectPersonalNeedSignalContactUseCase,
    GetNeedEngagementContactDetailsUseCase,
    ChurchNeedSignalsListener,
  ],
  controllers: [
    PublicPeopleController,
    NeedSignalsController,
    ChurchNeedSignalsController,
    UnreachedAreasController,
    UnreachedAreasAdminController,
  ],
  exports: [TypeOrmModule],
})
export class PublicModule {}
