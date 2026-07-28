import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Church } from '../../core/churches/entities/church.entity';
import { PublicChurchRelation } from './entities/public_church_relation.entity';
import { EcosystemHistory } from '../ecosystem/entities/ecosystem-history.entity';
import { PublicRelationsController } from './controllers/public-relations.controller';
import { PublicRelationsService } from './services/public-relations.service';
import { EcosystemContributionsModule } from '../ecosystem/ecosystem-contributions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PublicChurchRelation, Church, EcosystemHistory]),
    EcosystemContributionsModule,
  ],
  controllers: [PublicRelationsController],
  providers: [PublicRelationsService],
})
export class PublicRelationsModule {}
