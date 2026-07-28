import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NeedSignal } from '../../need/entities/need-signal.entity';
import { TerritorialController } from './territorial.controller';
import { TerritorialService } from './territorial.service';
import { PublicAdminModule } from '../../church/public-admin.module';
import { ChurchPublicProfile } from '../../church/entities/church_public_profile.entity';
import { PublicChurchRelation } from '../../church/entities/public_church_relation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChurchPublicProfile,
      PublicChurchRelation,
      NeedSignal,
    ]),
    PublicAdminModule, // To use ChurchOwnershipService
  ],
  controllers: [TerritorialController],
  providers: [TerritorialService],
  exports: [TerritorialService],
})
export class TerritorialModule {}
