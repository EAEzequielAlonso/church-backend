import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmallGroup } from './entities/small-group.entity';
import { SmallGroupsService } from './services/small-groups.service';
import { EcosystemActivitiesModule } from 'src/public/ecosystem/ecosystem-activities.module';
import { SmallGroupsController } from './controllers/small-groups.controller';
import { SmallGroupsPolicies } from './services/small-groups.policies';
import { PublicChurchRelation } from 'src/public/church/entities/public_church_relation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SmallGroup, PublicChurchRelation]),
    EcosystemActivitiesModule,
  ],
  controllers: [SmallGroupsController],
  providers: [SmallGroupsService, SmallGroupsPolicies],
  exports: [SmallGroupsService],
})
export class SmallGroupsModule {}
