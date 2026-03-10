import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MinistryRoleAssignment } from '../entities/ministry-role-assignment.entity';
import { MinistryPolicy } from '../policies/ministry.policy';
import { SystemRole, FunctionalRole } from '../../common/enums';

@Injectable()
export class DeleteMinistryAssignmentUseCase {
    constructor(
        @InjectRepository(MinistryRoleAssignment)
        private readonly assignmentRepo: Repository<MinistryRoleAssignment>,
        private readonly ministryPolicy: MinistryPolicy,
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

        return this.assignmentRepo.remove(assignment);
    }
}
