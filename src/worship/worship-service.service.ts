import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { WorshipService } from './entities/worship-service.entity';
import { ServiceSection } from './entities/service-section.entity';
import { ServiceTemplate } from './entities/service-template.entity';
import { ServiceTemplateSection } from './entities/service-template-section.entity';
import { MinistryRoleAssignment } from '../ministries/entities/ministry-role-assignment.entity';
import { ServiceStatus } from './entities/worship-service.entity';
import { AgendaSyncService } from '../agenda/agenda-sync.service';
import { EventSourceType, CalendarEventType } from '../common/enums';
import { SectionType } from './enums/section-type.enum';
import { CreateTemplateSectionDto } from './dto/create-template-section.dto';
import { UpdateTemplateSectionDto } from './dto/update-template-section.dto';
import { AppPermission } from '../auth/authorization/permissions.enum';

@Injectable()
export class WorshipServiceService {
  constructor(
    @InjectRepository(WorshipService)
    private serviceRepo: Repository<WorshipService>,
    @InjectRepository(ServiceSection)
    private sectionRepo: Repository<ServiceSection>,
    @InjectRepository(ServiceTemplate)
    private templateRepo: Repository<ServiceTemplate>,
    @InjectRepository(ServiceTemplateSection)
    private templateSectionRepo: Repository<ServiceTemplateSection>,
    @InjectRepository(MinistryRoleAssignment)
    private assignmentRepo: Repository<MinistryRoleAssignment>,
    private readonly agendaSyncService: AgendaSyncService,
  ) { }

  // --- TEMPLATES ---

  async findAllTemplates(churchId: string) {
    return this.templateRepo.find({
      where: { churchId: churchId },
      relations: ['sections', 'sections.ministry'],
    });
  }

  async createTemplate(churchId: string, data: any) {
    // Simple create logic, handling sections creation if passed or separate endpoint
    const template = this.templateRepo.create({
      ...data,
      churchId: churchId,
    });
    return this.templateRepo.save(template);
  }

  async findTemplate(id: string, churchId: string) {
    return this.templateRepo.findOne({
      where: { id, churchId },
      relations: ['sections', 'sections.ministry'],
      order: { sections: { order: 'ASC' } },
    });
  }

  async deleteTemplate(id: string, churchId: string) {
    const template = await this.templateRepo.findOne({ where: { id, churchId } });
    if (!template) throw new NotFoundException('Plantilla no encontrada');
    return this.templateRepo.remove(template);
  }

  async addTemplateSection(templateId: string, churchId: string, dto: CreateTemplateSectionDto) {
    const template = await this.templateRepo.findOne({
      where: { id: templateId, churchId },
    });
    if (!template) throw new NotFoundException('Plantilla no encontrada');

    const section = this.templateSectionRepo.create({
      template,
      title: dto.title,
      defaultDuration: dto.type === SectionType.GLOBAL_ACTIVITY ? 0 : dto.defaultDuration || 15,
      order: dto.order || 0,
      type: dto.type,
      ministryId: dto.ministryId,
    });

    const savedSection = await this.templateSectionRepo.save(section);

    // Touch template to update updatedAt
    await this.templateRepo.update(templateId, { updatedAt: new Date() });

    return savedSection;
  }

  async deleteTemplateSection(templateId: string, sectionId: string, churchId: string) {
    // First verify the template belongs to the church
    const template = await this.templateRepo.findOne({ where: { id: templateId, churchId } });
    if (!template) throw new NotFoundException('Plantilla no encontrada');

    const section = await this.templateSectionRepo.findOne({
      where: { id: sectionId, templateId: templateId },
    });
    if (!section) throw new NotFoundException('Sección no encontrada');

    await this.templateSectionRepo.remove(section);

    // Touch template to update updatedAt
    await this.templateRepo.update(templateId, { updatedAt: new Date() });

    return { success: true };
  }

  async updateTemplate(id: string, churchId: string, data: any) {
    const template = await this.templateRepo.findOne({ where: { id, churchId } });
    if (!template) throw new NotFoundException('Plantilla no encontrada');

    Object.assign(template, data);
    return this.templateRepo.save(template);
  }

  async updateTemplateSection(templateId: string, sectionId: string, churchId: string, dto: UpdateTemplateSectionDto) {
    const template = await this.templateRepo.findOne({ where: { id: templateId, churchId } });
    if (!template) throw new NotFoundException(`Plantilla no encontrada (${templateId})`);

    const section = await this.templateSectionRepo.findOne({
      where: { id: sectionId, templateId: templateId },
    });
    if (!section) throw new NotFoundException(`Sección no encontrada (${sectionId})`);

    // Update basic fields
    if (dto.title !== undefined) section.title = dto.title;
    if (dto.type !== undefined) section.type = dto.type;
    if (dto.defaultDuration !== undefined) {
      section.defaultDuration = section.type === SectionType.GLOBAL_ACTIVITY ? 0 : dto.defaultDuration;
    }
    if (dto.ministryId !== undefined) section.ministryId = dto.ministryId;

    const savedSection = await this.templateSectionRepo.save(section);

    // Touch template to update updatedAt
    await this.templateRepo.update(templateId, { updatedAt: new Date() });

    return savedSection;
  }

  // --- SERVICES & HYDRATION ---

  async findAllServices(churchId: string, userPermissions: AppPermission[]) {
    const canManage = userPermissions.includes(AppPermission.WORSHIP_MANAGE);
    return this.serviceRepo.find({
      where: canManage
        ? { churchId: churchId }
        : { churchId: churchId, status: ServiceStatus.CONFIRMED },
      order: { date: 'DESC' },
    });
  }

  async findUpcomingServices(churchId: string) {
    return this.serviceRepo.find({
      where: {
        churchId: churchId,
        status: ServiceStatus.CONFIRMED,
        date: MoreThan(new Date()),
      },
      order: { date: 'ASC' },
      take: 3,
    });
  }

  async findOneService(id: string, churchId: string, userPermissions?: AppPermission[]) {
    let service = await this.serviceRepo.findOne({
      where: { id, churchId },
      relations: [
        'sections',
        'sections.ministry',
        'template',
      ],
      order: {
        sections: { order: 'ASC' },
      },
    });

    if (!service) throw new NotFoundException('Culto no encontrado');
    const canManage = (userPermissions ?? []).includes(AppPermission.WORSHIP_MANAGE);
    if (!canManage && service.status !== ServiceStatus.CONFIRMED) {
      throw new ForbiddenException('Insufficient permissions to view draft services');
    }

    // FORCE SYNC IF DRAFT AND TEMPLATE CHANGED
    if (service.status !== ServiceStatus.CONFIRMED && service.template) {
      // Re-fetch template to get latest timestamp comparison if needed,
      // but service.template (relation) might have old data if not strictly joined with selected cols?
      // TypeORM relations usually fetch the related entity fields.
      // Let's ensure we compare correctly.

      // We use a small buffer or direct comparison.
      // Template updatedAt > Service updatedAt = Template is newer.
      // Note: service.updatedAt was set when we created it.
      // If we modify template 1 sec later, it is newer.
      if (service.template.updatedAt > service.updatedAt) {
        // Check if it's REALLY newer (e.g. by at least 2 seconds to avoid race conditions on creation?)
        // Actually, standard comparison is fine.
        service = await this.syncServiceWithTemplate(service);
      }
    }

    // HYDRATION: Fetch assignments for this service
    const assignments = await this.assignmentRepo.find({
      where: { serviceId: service.id },
      relations: ['role', 'person', 'ministry', 'section'],
    });

    // Attach assignments to sections dynamically
    const richSections = service.sections.map((section) => {
      // Find assignments for this specific section
      const sectionAssignments = assignments.filter((a) => a.sectionId === section.id);

      const filledRoles = sectionAssignments.map((assignment) => {
        return {
          id: assignment.id,
          role: assignment.role,
          status: 'ASSIGNED',
          assignedPerson: assignment.person,
          metadata: assignment.metadata,
        };
      });

      // Also consider Global Assignments (without sectionId) if needed? 
      // For now, only section-specific as requested.

      return {
        ...section,
        filledRoles,
      };
    });

    return {
      ...service,
      sections: richSections,
    };
  }

  /**
   * Internal method to re-sync a service with its template.
   * Deletes all current sections and re-copies from template.
   */
  private async syncServiceWithTemplate(
    service: WorshipService,
  ): Promise<WorshipService> {
    // 1. Fetch full template with sections
    const template = await this.templateRepo.findOne({
      where: { id: service.template.id },
      relations: ['sections', 'sections.ministry'],
    });

    if (!template) return service; // Should not happen

    // 2. Delete existing service sections
    // We can use the repository to delete by service ID
    // But we need to be careful with cascading.
    // service.sections are loaded.
    await this.sectionRepo.remove(service.sections);

    // 3. Re-create sections
    const newSections = template.sections.map((ts) => {
      return this.sectionRepo.create({
        service: service,
        title: ts.title,
        order: ts.order,
        duration: ts.type === SectionType.GLOBAL_ACTIVITY ? 0 : ts.defaultDuration,
        type: ts.type,
        ministry: ts.ministry,
      });
    });

    await this.sectionRepo.save(newSections);

    // 4. Update Service UpdatedAt to now (so we don't sync again until template changes)
    // This is crucial. `save` on sections might not touch service.
    // We explicitly touch the service.
    await this.serviceRepo.update(service.id, { updatedAt: new Date() });

    // 5. Refetch the fresh service to return it
    return this.serviceRepo.findOne({
      where: { id: service.id, churchId: service.churchId },
      relations: [
        'sections',
        'sections.ministry',
        'sections.ministry.serviceDuties',
        'sections.ministry.serviceDuties.ministry',
        'template',
      ],
      order: { sections: { order: 'ASC' } },
    });
  }

  async deleteService(id: string, churchId: string) {
    const service = await this.serviceRepo.findOne({ where: { id, churchId } });
    if (!service) throw new NotFoundException('Culto no encontrado');
    
    await this.agendaSyncService.deleteProjection(EventSourceType.MEETING, service.id);

    return this.serviceRepo.remove(service);
  }

  async createServiceFromTemplate(
    churchId: string,
    templateId: string,
    date: string,
  ) {
    const template = await this.templateRepo.findOne({
      where: { id: templateId, churchId },
      relations: ['sections', 'sections.ministry'],
    });
    if (!template) throw new NotFoundException('Plantilla no encontrada');

    const service = this.serviceRepo.create({
      date: new Date(date),
      churchId: churchId,
      status: ServiceStatus.DRAFT,
      template,
      topic: template.name,
    });

    const savedService = await this.serviceRepo.save(service);

    // Copy Sections
    const sections = template.sections.map((ts) => {
      return this.sectionRepo.create({
        service: savedService,
        title: ts.title,
        order: ts.order,
        duration: ts.type === SectionType.GLOBAL_ACTIVITY ? 0 : ts.defaultDuration,
        type: ts.type,
        ministry: ts.ministry,
      });
    });

    await this.sectionRepo.save(sections);

    const fakeEndDate = new Date(savedService.date.getTime() + 2 * 60 * 60 * 1000);
    const projection = await this.agendaSyncService.createProjection({
        title: savedService.topic || 'Reunión General',
        description: template.description || 'Reunión planificada',
        startDate: savedService.date,
        endDate: fakeEndDate,
        location: 'Templo Principal',
        sourceType: EventSourceType.MEETING,
        sourceId: savedService.id,
        type: CalendarEventType.SERVICE,
        attendees: [],
    });

    savedService.calendarEventId = projection.id;
    await this.serviceRepo.save(savedService);

    return this.findOneService(savedService.id, churchId, [AppPermission.WORSHIP_MANAGE]);
  }

  async updateSection(sectionId: string, churchId: string, data: any) {
    const section = await this.sectionRepo.findOne({
      where: { id: sectionId, service: { churchId } },
      relations: ['service'],
    });
    if (!section) throw new NotFoundException('Sección no encontrada');
    Object.assign(section, data);
    return this.sectionRepo.save(section);
  }

  async confirmService(id: string, churchId: string) {
    const service = await this.serviceRepo.findOne({ where: { id, churchId } });
    if (!service) throw new NotFoundException('Culto no encontrado');

    service.status = ServiceStatus.CONFIRMED;
    return this.serviceRepo.save(service);
  }

  async updateService(id: string, churchId: string, data: any) {
    const service = await this.serviceRepo.findOne({ where: { id, churchId } });
    if (!service) throw new NotFoundException('Culto no encontrado');

    if (data.date) service.date = new Date(data.date);
    if (data.topic !== undefined) service.topic = data.topic;
    if (data.status !== undefined) service.status = data.status;

    const updatedService = await this.serviceRepo.save(service);

    const fakeEndDate = new Date(updatedService.date.getTime() + 2 * 60 * 60 * 1000);
    await this.agendaSyncService.updateProjection(EventSourceType.MEETING, updatedService.id, {
        title: updatedService.topic || 'Reunión General',
        startDate: updatedService.date,
        endDate: fakeEndDate,
    });

    return updatedService;
  }
}
