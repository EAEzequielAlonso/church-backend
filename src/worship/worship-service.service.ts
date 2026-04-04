import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, MoreThan, Repository } from 'typeorm';
import { WorshipService } from './entities/worship-service.entity';
import { ServiceSection } from './entities/service-section.entity';
import { ServiceTemplate } from './entities/service-template.entity';
import { ServiceTemplateSection } from './entities/service-template-section.entity';
import { MinistryRoleAssignment } from '../ministries/entities/ministry-role-assignment.entity';
import { ServiceStatus } from './entities/worship-service.entity';

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
  ) { }

  // --- TEMPLATES ---

  async findAllTemplates(churchId: string) {
    return this.templateRepo.find({
      where: { churchId: churchId },
      relations: ['sections', 'sections.requiredRoles'],
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
      relations: ['sections', 'sections.requiredRoles'],
      order: { sections: { order: 'ASC' } },
    });
  }

  async deleteTemplate(id: string, churchId: string) {
    const template = await this.templateRepo.findOne({ where: { id, churchId } });
    if (!template) throw new NotFoundException('Plantilla no encontrada');
    return this.templateRepo.remove(template);
  }

  async addTemplateSection(templateId: string, churchId: string, data: any) {
    const template = await this.templateRepo.findOne({
      where: { id: templateId, churchId },
    });
    if (!template) throw new NotFoundException('Plantilla no encontrada');

    const section = this.templateSectionRepo.create({
      template,
      title: data.title,
      defaultDuration: data.type === 'GLOBAL' ? 0 : data.defaultDuration || 15,
      order: data.order || 0,
      type: data.type,
      ministryId: data.ministryId || undefined,
    });

    if (data.requiredRoleIds && Array.isArray(data.requiredRoleIds)) {
      section.requiredRoles = data.requiredRoleIds.map((id: string) => ({
        id,
      }));
    }

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

  async updateTemplateSection(templateId: string, sectionId: string, churchId: string, data: any) {
    // First verify the template belongs to the church
    const template = await this.templateRepo.findOne({ where: { id: templateId, churchId } });
    if (!template) throw new NotFoundException(`Plantilla no encontrada (${templateId})`);

    const section = await this.templateSectionRepo.findOne({
      where: { id: sectionId, templateId: templateId },
      relations: ['requiredRoles'],
    });
    if (!section) throw new NotFoundException(`Sección no encontrada (${sectionId})`);

    // Update basic fields
    if (data.title !== undefined) section.title = data.title;
    if (data.type !== undefined) section.type = data.type;
    if (data.defaultDuration !== undefined) {
      section.defaultDuration = section.type === 'GLOBAL' ? 0 : data.defaultDuration;
    }
    if (data.ministryId !== undefined) section.ministryId = data.ministryId;

    // Update roles if provided
    if (data.requiredRoleIds && Array.isArray(data.requiredRoleIds)) {
      section.requiredRoles = data.requiredRoleIds.map((id: string) => ({ id }));
    }

    const savedSection = await this.templateSectionRepo.save(section);

    // Touch template to update updatedAt
    await this.templateRepo.update(templateId, { updatedAt: new Date() });

    return savedSection;
  }

  // --- SERVICES & HYDRATION ---

  async findAllServices(churchId: string) {
    return this.serviceRepo.find({
      where: { churchId: churchId },
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

  async findOneService(id: string, churchId: string) {
    let service = await this.serviceRepo.findOne({
      where: { id, churchId },
      relations: [
        'sections',
        'sections.requiredRoles',
        'sections.requiredRoles.ministry',
        'sections.ministry',
        'template',
      ],
      order: {
        sections: { order: 'ASC' },
      },
    });

    if (!service) throw new NotFoundException('Culto no encontrado');

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

    // HYDRATION: Fetch assignments for this date
    const dateStr =
      service.date instanceof Date
        ? service.date.toISOString().split('T')[0]
        : new Date(service.date).toISOString().split('T')[0];

    const start = new Date(dateStr + 'T00:00:00Z');
    const end = new Date(dateStr + 'T23:59:59Z');

    // Fetch all assignments for this date from Ministries
    const assignments = await this.assignmentRepo.find({
      where: { date: Between(start, end) },
      relations: ['role', 'person', 'ministry'],
    });

    // Attach assignments to sections dynamically
    const richSections = service.sections.map((section) => {
      const filledRoles = section.requiredRoles.map((role) => {
        // 1. Check Override
        const overridePersonId = section.overrides
          ? section.overrides[role.id]
          : null;
        let assignedPerson = null;
        let status = 'UNASSIGNED'; // UNASSIGNED, ASSIGNED, OVERRIDE
        let metadata = null;

        if (overridePersonId) {
          status = 'OVERRIDE';
          // We would fetch the Person details for the override ID here if we want full details
          // For now, let's assume frontend fetches or we add a quick lookup
          assignedPerson = { id: overridePersonId, name: 'Override Person' }; // TODO: Fetch info
        } else {
          // 2. Check Ministry Assignment
          const assignment = assignments.find((a) => a.role.id === role.id);
          if (assignment) {
            status = 'ASSIGNED';
            assignedPerson = assignment.person;
            metadata = assignment.metadata; // Hydrate metadata
          }
        }

        return {
          role,
          status,
          assignedPerson,
          metadata,
        };
      });

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
      relations: ['sections', 'sections.requiredRoles', 'sections.ministry'],
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
        service: service, // Link to the service entity
        title: ts.title,
        order: ts.order,
        duration: ts.type === 'GLOBAL' ? 0 : ts.defaultDuration,
        type: ts.type,
        ministry: ts.ministry,
        requiredRoles: ts.requiredRoles,
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
        'sections.requiredRoles',
        'sections.requiredRoles.ministry',
        'sections.ministry',
        'template',
      ],
      order: { sections: { order: 'ASC' } },
    });
  }

  async deleteService(id: string, churchId: string) {
    const service = await this.serviceRepo.findOne({ where: { id, churchId } });
    if (!service) throw new NotFoundException('Culto no encontrado');
    return this.serviceRepo.remove(service);
  }

  async createServiceFromTemplate(
    churchId: string,
    templateId: string,
    date: string,
  ) {
    const template = await this.templateRepo.findOne({
      where: { id: templateId, churchId },
      relations: ['sections', 'sections.requiredRoles', 'sections.ministry'],
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
        duration: ts.type === 'GLOBAL' ? 0 : ts.defaultDuration,
        type: ts.type, // Copy TYPE (Fixes Global bug)
        ministry: ts.ministry, // Copy Ministry
        requiredRoles: ts.requiredRoles,
      });
    });

    await this.sectionRepo.save(sections);
    return this.findOneService(savedService.id, churchId);
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

    return this.serviceRepo.save(service);
  }
}
