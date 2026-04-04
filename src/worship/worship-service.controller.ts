import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WorshipServiceService } from './worship-service.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AppPermission } from '../auth/authorization/permissions.enum'; // Assuming generic or check
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CurrentChurch } from '../common/decorators';
import { FunctionalRole } from '../common/enums';

import { SubscriptionGuard } from '../subscriptions/guards/subscription.guard';

@Controller('worship-services')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
export class WorshipServiceController {
  constructor(private readonly worshipService: WorshipServiceService) {}

  // --- TEMPLATES ---
  @Get('templates')
  @Roles(FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR)
  getTemplates(@CurrentChurch() churchId: string) {
    return this.worshipService.findAllTemplates(churchId);
  }

  @Post('templates')
  @Roles(FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR)
  createTemplate(@CurrentChurch() churchId: string, @Body() body: any) {
    return this.worshipService.createTemplate(churchId, body);
  }

  @Patch('templates/:id/sections/:sectionId')
  @Roles(FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR)
  updateTemplateSection(
    @CurrentChurch() churchId: string,
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Body() body: any,
  ) {
    return this.worshipService.updateTemplateSection(id, sectionId, churchId, body);
  }

  @Delete('templates/:id/sections/:sectionId')
  @Roles(FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR)
  deleteTemplateSection(
    @CurrentChurch() churchId: string,
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
  ) {
    return this.worshipService.deleteTemplateSection(id, sectionId, churchId);
  }

  @Post('templates/:id/sections')
  @Roles(FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR)
  addTemplateSection(@CurrentChurch() churchId: string, @Param('id') id: string, @Body() body: any) {
    return this.worshipService.addTemplateSection(id, churchId, body);
  }

  @Get('templates/:id')
  @Roles(FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR)
  getTemplate(@CurrentChurch() churchId: string, @Param('id') id: string) {
    return this.worshipService.findTemplate(id, churchId);
  }

  @Patch('templates/:id')
  @Roles(FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR)
  updateTemplate(@CurrentChurch() churchId: string, @Param('id') id: string, @Body() body: any) {
    return this.worshipService.updateTemplate(id, churchId, body);
  }

  @Delete('templates/:id')
  @Roles(FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR)
  deleteTemplate(@CurrentChurch() churchId: string, @Param('id') id: string) {
    return this.worshipService.deleteTemplate(id, churchId);
  }

  // --- SERVICES ---

  @Get()
  findAll(@CurrentChurch() churchId: string) {
    return this.worshipService.findAllServices(churchId);
  }

  @Get('upcoming')
  getUpcoming(@CurrentChurch() churchId: string) {
    return this.worshipService.findUpcomingServices(churchId);
  }

  @Get(':id')
  findOne(@CurrentChurch() churchId: string, @Param('id') id: string) {
    return this.worshipService.findOneService(id, churchId);
  }

  @Post()
  @Roles(FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR, FunctionalRole.MINISTRY_LEADER)
  createFromTemplate(
    @CurrentChurch() churchId: string,
    @Body() body: { templateId: string; date: string },
  ) {
    return this.worshipService.createServiceFromTemplate(
      churchId,
      body.templateId,
      body.date,
    );
  }

  @Patch('sections/:id')
  @Roles(FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR, FunctionalRole.MINISTRY_LEADER)
  updateSection(@CurrentChurch() churchId: string, @Param('id') id: string, @Body() body: any) {
    return this.worshipService.updateSection(id, churchId, body);
  }

  @Delete(':id')
  @Roles(FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR, FunctionalRole.MINISTRY_LEADER)
  delete(@CurrentChurch() churchId: string, @Param('id') id: string) {
    return this.worshipService.deleteService(id, churchId);
  }

  @Patch(':id/confirm')
  @Roles(FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR, FunctionalRole.MINISTRY_LEADER)
  confirm(@CurrentChurch() churchId: string, @Param('id') id: string) {
    return this.worshipService.confirmService(id, churchId);
  }

  @Patch(':id')
  @Roles(FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR, FunctionalRole.MINISTRY_LEADER)
  updateService(
    @CurrentChurch() churchId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.worshipService.updateService(id, churchId, body);
  }
}
