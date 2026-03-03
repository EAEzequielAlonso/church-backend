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

@Controller('worship-services')
@UseGuards(JwtAuthGuard)
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
  getTemplate(@Param('id') id: string) {
    return this.worshipService.findTemplate(id);
  }

  @Delete('templates/:id')
  deleteTemplate(@Param('id') id: string) {
    return this.worshipService.deleteTemplate(id);
  }

  @Post('templates/:id/sections')
  addTemplateSection(@Param('id') id: string, @Body() body: any) {
    return this.worshipService.addTemplateSection(id, body);
  }

  @Delete('templates/:id/sections/:sectionId')
  deleteTemplateSection(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
  ) {
    return this.worshipService.deleteTemplateSection(id, sectionId);
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
  findOne(@Param('id') id: string) {
    return this.worshipService.findOneService(id);
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
  updateSection(@Param('id') id: string, @Body() body: any) {
    return this.worshipService.updateSection(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.worshipService.deleteService(id);
  }
  @Patch(':id/confirm')
  confirm(@Param('id') id: string) {
    return this.worshipService.confirmService(id);
  }
}
