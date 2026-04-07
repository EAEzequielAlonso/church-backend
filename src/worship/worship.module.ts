import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorshipServiceController } from './worship-service.controller';
import { WorshipServiceService } from './worship-service.service';
import { ServiceTemplate } from './entities/service-template.entity';
import { ServiceTemplateSection } from './entities/service-template-section.entity';
import { WorshipService } from './entities/worship-service.entity';
import { ServiceSection } from './entities/service-section.entity';
import { ServiceDuty } from '../ministries/entities/service-duty.entity';
import { MinistryRoleAssignment } from '../ministries/entities/ministry-role-assignment.entity';
import { AgendaModule } from '../agenda/agenda.module';

@Module({
  imports: [
    AgendaModule,
    TypeOrmModule.forFeature([
      ServiceTemplate,
      ServiceTemplateSection,
      WorshipService,
      ServiceSection,
      ServiceDuty,
      MinistryRoleAssignment,
    ]),
  ],
  controllers: [WorshipServiceController],
  providers: [WorshipServiceService],
  exports: [WorshipServiceService],
})
export class WorshipModule {}
