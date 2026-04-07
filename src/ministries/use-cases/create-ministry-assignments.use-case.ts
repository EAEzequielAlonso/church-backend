import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { MinistryRoleAssignment } from '../entities/ministry-role-assignment.entity';
import { AgendaSyncService } from '../../agenda/agenda-sync.service';
import { EventSourceType } from '../../common/enums';
import { ServiceDuty } from '../entities/service-duty.entity';
import { Ministry } from '../entities/ministry.entity';
import { MinistryAssignmentDto } from '../dto/create-ministry-assignments.dto';
import { Person } from '../../users/entities/person.entity';
import { MinistryPolicy } from '../policies/ministry.policy';
import { SystemRole, FunctionalRole } from '../../common/enums';

@Injectable()
export class CreateMinistryAssignmentsUseCase {
    constructor(
        @InjectRepository(MinistryRoleAssignment)
        private readonly assignmentRepo: Repository<MinistryRoleAssignment>,
        private readonly ministryPolicy: MinistryPolicy,
        private readonly agendaSyncService: AgendaSyncService,
    ) { }

    async execute(
        ministryId: string,
        assignments: MinistryAssignmentDto[],
        churchId: string,
        requestPersonId: string,
        systemRole: SystemRole,
        functionalRole: FunctionalRole
    ): Promise<MinistryRoleAssignment[]> {

        await this.ministryPolicy.assertCanManage(ministryId, requestPersonId, churchId, systemRole, functionalRole);

        const created: MinistryRoleAssignment[] = [];
        const affectedServiceIds = new Set<string>();

        for (const dto of assignments) {
            affectedServiceIds.add(dto.serviceId);

            const existing = await this.assignmentRepo.findOne({
                where: {
                    ministryId,
                    roleId: dto.roleId,
                    serviceId: dto.serviceId,
                    sectionId: dto.sectionId || null,
                },
            });

            if (existing) {
                existing.personId = dto.personId;
                existing.metadata = dto.metadata || null;
                if (dto.serviceType) existing.serviceType = dto.serviceType;
                created.push(await this.assignmentRepo.save(existing));
            } else {
                const assignment = this.assignmentRepo.create({
                    ministryId,
                    roleId: dto.roleId,
                    personId: dto.personId,
                    serviceId: dto.serviceId,
                    serviceType: dto.serviceType,
                    sectionId: dto.sectionId,
                    metadata: dto.metadata || null,
                });
                created.push(await this.assignmentRepo.save(assignment));
            }
        }

        // Actualización de attendees
        for (const serviceId of affectedServiceIds) {
            const allAssignmentsForService = await this.assignmentRepo.find({
                where: { serviceId }
            });

            const uniquePersonIds = Array.from(new Set(allAssignmentsForService.map(a => a.personId)));
            const attendees = uniquePersonIds.map(id => ({ id } as any)); 

            await this.agendaSyncService.updateProjection(
                EventSourceType.MEETING, 
                serviceId, 
                { attendees }
            );
        }

        return created;
    }
}
