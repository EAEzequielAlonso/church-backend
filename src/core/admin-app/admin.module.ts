import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from 'src/core/users/entities/user.entity';
import { Person } from 'src/core/users/entities/person.entity';
import { Church } from 'src/core/churches/entities/church.entity';
import { ChurchClaim } from '../../public/church/entities/church_claim.entity';
import { PublicChurchRelation } from 'src/public/church/entities/public_church_relation.entity';
import { EcosystemContributionsModule } from '../../public/ecosystem/ecosystem-contributions.module';
import { ChurchProfileModule } from 'src/public/church/church-profile/church-profile.module';
import { ChurchPublicProfile } from '../../public/church/entities/church_public_profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Person,
      Church,
      ChurchPublicProfile,
      ChurchClaim,
      PublicChurchRelation,
    ]),
    EcosystemContributionsModule,
    ChurchProfileModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
