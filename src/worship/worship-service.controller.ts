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
import { CurrentChurch } from '../common/decorators';

import { SubscriptionGuard } from '../subscriptions/guards/subscription.guard';
@Controller('worship-services')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class WorshipServiceController {
  constructor(private readonly worshipService: WorshipServiceService) {}

  // --- TEMPLATES ---
  @Get('templates')
  getTemplates(@CurrentChurch() churchId: string) {
    return this.worshipService.findAllTemplates(churchId);
  }

  @Post('templates')
  createTemplate(@CurrentChurch() churchId: string, @Body() body: any) {
    return this.worshipService.createTemplate(churchId, body);
  }

  @Get('templates/:id')
  getTemplate(@CurrentChurch() churchId: string, @Param('id') id: string) {
    return this.worshipService.findTemplate(id, churchId);
  }

  @Delete('templates/:id')
  deleteTemplate(@CurrentChurch() churchId: string, @Param('id') id: string) {
    return this.worshipService.deleteTemplate(id, churchId);
  }

  @Post('templates/:id/sections')
  addTemplateSection(@CurrentChurch() churchId: string, @Param('id') id: string, @Body() body: any) {
    return this.worshipService.addTemplateSection(id, churchId, body);
  }

  @Delete('templates/:id/sections/:sectionId')
  deleteTemplateSection(
    @CurrentChurch() churchId: string,
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
  ) {
    return this.worshipService.deleteTemplateSection(id, sectionId, churchId);
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
  updateSection(@CurrentChurch() churchId: string, @Param('id') id: string, @Body() body: any) {
    return this.worshipService.updateSection(id, churchId, body);
  }

  @Delete(':id')
  delete(@CurrentChurch() churchId: string, @Param('id') id: string) {
    return this.worshipService.deleteService(id, churchId);
  }
  @Patch(':id/confirm')
  confirm(@CurrentChurch() churchId: string, @Param('id') id: string) {
    return this.worshipService.confirmService(id, churchId);
  }
}
