import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChurchPublicProfile } from '../entities/church_public_profile.entity';
import { Church } from '../../../core/churches/entities/church.entity';
import { ChurchDirectoryController } from './church-directory.controller';
import { ChurchDirectoryService } from './services/church-directory.service';
import { ChurchSlugService } from './services/church-slug.service';
import { CreatePublicChurchUseCase } from './use-cases/create-public-church.use-case';
import { EcosystemContributionsModule } from 'src/public/ecosystem/ecosystem-contributions.module';
import { EcosystemActivitiesModule } from 'src/public/ecosystem/ecosystem-activities.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChurchPublicProfile, Church]),
    EcosystemContributionsModule,
    EcosystemActivitiesModule,
  ],
  controllers: [ChurchDirectoryController],
  providers: [ChurchDirectoryService, ChurchSlugService, CreatePublicChurchUseCase],
  exports: [ChurchDirectoryService],
})
export class ChurchDirectoryModule { }
