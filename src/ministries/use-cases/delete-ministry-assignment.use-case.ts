import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MinistryRoleAssignment } from '../entities/ministry-role-assignment.entity';
import { MinistryPolicy } from '../policies/ministry.policy';
import { SystemRole, FunctionalRole, EventSourceType } from '../../common/enums';
import { AgendaSyncService } from '../../agenda/agenda-sync.service';

@Injectable()
export class DeleteMinistryAssignmentUseCase {
    constructor(
        @InjectRepository(MinistryRoleAssignment)
        private readonly assignmentRepo: Repository<MinistryRoleAssignment>,
        private readonly ministryPolicy: MinistryPolicy,
        private readonly agendaSyncService: AgendaSyncService,
    ) { }

    async execute(
        ministryId: string,
        assignmentId: string,
        churchId: string,
        requestPersonId: string,
        systemRole: SystemRole,
        functionalRole: FunctionalRole
    ): Promise<MinistryRoleAssignment> {

        await this.ministryPolicy.assertCanManage(ministryId, requestPersonId, churchId, systemRole, functionalRole);

        const assignment = await this.assignmentRepo.findOne({
            where: { id: assignmentId, ministryId },
        });

        if (!assignment) throw new NotFoundException('Asignación no encontrada');
        const serviceId = assignment.serviceId;

        await this.assignmentRepo.remove(assignment);

        if (serviceId) {
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

        return assignment;
    }
}
