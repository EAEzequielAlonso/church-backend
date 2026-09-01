import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctrinalOpinion } from 'src/public/church/entities/doctrinal-opinion.entity';
import { DoctrinalOpinionsService } from './doctrinal-opinions.service';
import { DoctrinalOpinionsController } from './doctrinal-opinions.controller';
import { EcosystemContributionsModule } from 'src/public/ecosystem/ecosystem-contributions.module';
import { EcosystemActivitiesModule } from 'src/public/ecosystem/ecosystem-activities.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DoctrinalOpinion]),
    EcosystemContributionsModule,
    EcosystemActivitiesModule,
  ],
  providers: [DoctrinalOpinionsService],
  controllers: [DoctrinalOpinionsController],
  exports: [DoctrinalOpinionsService],
})
export class DoctrinalOpinionsModule {}
