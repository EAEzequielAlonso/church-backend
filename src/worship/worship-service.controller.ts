import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { WorshipServiceService } from './worship-service.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SecurityContextGuard } from '../auth/guards/security-context.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AppPermission } from '../auth/authorization/permissions.enum';
import { CurrentChurch, CurrentUser } from '../common/decorators';
import { SecurityContext } from '../auth/security-context.interface';
import { SubscriptionGuard } from '../subscriptions/guards/subscription.guard';
import { CreateTemplateSectionDto } from './dto/create-template-section.dto';
import { UpdateTemplateSectionDto } from './dto/update-template-section.dto';

@Controller('worship-services')
@UseGuards(JwtAuthGuard, SecurityContextGuard, PermissionsGuard, SubscriptionGuard)
export class WorshipServiceController {
  constructor(private readonly worshipService: WorshipServiceService) {}

  // --- TEMPLATES ---
  @Get('templates')
  @RequirePermissions(AppPermission.WORSHIP_TEMPLATE_MANAGE)
  getTemplates(@CurrentChurch() churchId: string) {
    return this.worshipService.findAllTemplates(churchId);
  }

  @Post('templates')
  @RequirePermissions(AppPermission.WORSHIP_TEMPLATE_MANAGE)
  createTemplate(@CurrentChurch() churchId: string, @Body() body: any) {
    return this.worshipService.createTemplate(churchId, body);
  }

  @Post('templates/:id/sections')
  @RequirePermissions(AppPermission.WORSHIP_TEMPLATE_MANAGE)
  addTemplateSection(
    @CurrentChurch() churchId: string,
    @Param('id') id: string,
    @Body() dto: CreateTemplateSectionDto,
  ) {
    return this.worshipService.addTemplateSection(id, churchId, dto);
  }

  @Patch('templates/:id/sections/:sectionId')
  @RequirePermissions(AppPermission.WORSHIP_TEMPLATE_MANAGE)
  updateTemplateSection(
    @CurrentChurch() churchId: string,
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: UpdateTemplateSectionDto,
  ) {
    return this.worshipService.updateTemplateSection(id, sectionId, churchId, dto);
  }

  @Delete('templates/:id/sections/:sectionId')
  @RequirePermissions(AppPermission.WORSHIP_TEMPLATE_MANAGE)
  deleteTemplateSection(
    @CurrentChurch() churchId: string,
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
  ) {
    return this.worshipService.deleteTemplateSection(id, sectionId, churchId);
  }

  @Get('templates/:id')
  @RequirePermissions(AppPermission.WORSHIP_TEMPLATE_MANAGE)
  getTemplate(@CurrentChurch() churchId: string, @Param('id') id: string) {
    return this.worshipService.findTemplate(id, churchId);
  }

  @Patch('templates/:id')
  @RequirePermissions(AppPermission.WORSHIP_TEMPLATE_MANAGE)
  updateTemplate(@CurrentChurch() churchId: string, @Param('id') id: string, @Body() body: any) {
    return this.worshipService.updateTemplate(id, churchId, body);
  }

  @Delete('templates/:id')
  @RequirePermissions(AppPermission.WORSHIP_TEMPLATE_MANAGE)
  deleteTemplate(@CurrentChurch() churchId: string, @Param('id') id: string) {
    return this.worshipService.deleteTemplate(id, churchId);
  }

  // --- SERVICES ---

  @Get()
  @RequirePermissions(AppPermission.WORSHIP_VIEW)
  findAll(@CurrentChurch() churchId: string, @CurrentUser() securityContext: SecurityContext) {
    return this.worshipService.findAllServices(churchId, securityContext.permissions ?? []);
  }

  @Get('upcoming')
  @RequirePermissions(AppPermission.WORSHIP_VIEW)
  getUpcoming(@CurrentChurch() churchId: string) {
    return this.worshipService.findUpcomingServices(churchId);
  }

  @Get(':id')
  @RequirePermissions(AppPermission.WORSHIP_VIEW)
  findOne(@CurrentChurch() churchId: string, @Param('id') id: string, @CurrentUser() securityContext: SecurityContext) {
    return this.worshipService.findOneService(id, churchId, securityContext.permissions ?? []);
  }

  @Post()
  @RequirePermissions(AppPermission.WORSHIP_MANAGE)
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
  @RequirePermissions(AppPermission.WORSHIP_MANAGE)
  updateSection(@CurrentChurch() churchId: string, @Param('id') id: string, @Body() body: any) {
    return this.worshipService.updateSection(id, churchId, body);
  }

  @Delete(':id')
  @RequirePermissions(AppPermission.WORSHIP_MANAGE)
  delete(@CurrentChurch() churchId: string, @Param('id') id: string) {
    return this.worshipService.deleteService(id, churchId);
  }

  @Patch(':id/confirm')
  @RequirePermissions(AppPermission.WORSHIP_PUBLISH)
  confirm(@CurrentChurch() churchId: string, @Param('id') id: string) {
    return this.worshipService.confirmService(id, churchId);
  }

  @Patch(':id')
  @RequirePermissions(AppPermission.WORSHIP_MANAGE)
  updateService(
    @CurrentChurch() churchId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.worshipService.updateService(id, churchId, body);
  }
}


