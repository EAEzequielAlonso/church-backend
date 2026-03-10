import { Injectable, ForbiddenException } from '@nestjs/common';
import { MinistryRole, FunctionalRole, SystemRole } from '../../common/enums';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MinistryMember } from '../entities/ministry-member.entity';
import { MinistryTask } from '../entities/ministry-task.entity';

@Injectable()
export class MinistryPolicy {
    constructor(
        @InjectRepository(MinistryMember)
        private readonly memberRepo: Repository<MinistryMember>,
    ) { }

    /**
     * Only ADMIN_CHURCH always passes these checks by default.
     */
    canBypass(systemRole: SystemRole, functionalRole: FunctionalRole): boolean {
        return systemRole === SystemRole.ADMIN_APP || functionalRole === FunctionalRole.ADMIN_CHURCH;
    }

    /**
     * General role assertion (Used by Guards or UseCases).
     */
    async assertHasRole(
        ministryId: string,
        personId: string,
        churchId: string,
        systemRole: SystemRole,
        functionalRole: FunctionalRole,
        allowedRoles: MinistryRole[],
    ): Promise<MinistryRole | null> {
        if (this.canBypass(systemRole, functionalRole)) {
            return MinistryRole.LEADER; // simulate maximum privilege
        }

        const membership = await this.memberRepo.findOne({
            where: {
                ministry: { id: ministryId, churchId },
                member: { person: { id: personId } },
            },
            relations: ['ministry', 'member', 'member.person'],
        });

        if (!membership) {
            throw new ForbiddenException('User is not a member of this ministry.');
        }

        if (allowedRoles.length > 0 && !allowedRoles.includes(membership.roleInMinistry)) {
            throw new ForbiddenException('Insufficient ministry role permissions.');
        }

        return membership.roleInMinistry;
    }

    async assertCanManage(ministryId: string, personId: string, churchId: string, systemRole: SystemRole, functionalRole: FunctionalRole): Promise<void> {
        await this.assertHasRole(ministryId, personId, churchId, systemRole, functionalRole, [MinistryRole.LEADER, MinistryRole.COORDINATOR]);
    }

    async assertIsLeader(ministryId: string, personId: string, churchId: string, systemRole: SystemRole, functionalRole: FunctionalRole): Promise<void> {
        await this.assertHasRole(ministryId, personId, churchId, systemRole, functionalRole, [MinistryRole.LEADER]);
    }

    /**
     * Specific logic for updating tasks, allowing assignee or unassigned takeovers
     */
    async assertCanUpdateTask(
        task: MinistryTask,
        requestPersonId: string,
        systemRole: SystemRole,
        functionalRole: FunctionalRole
    ): Promise<MinistryMember | null> {

        const ministryId = task.ministry.id;
        const churchId = task.ministry.church.id;

        if (this.canBypass(systemRole, functionalRole)) {
            return null; // By-pass OK
        }

        let userRole: MinistryRole | null = null;
        let actingMember: MinistryMember | null = null;

        try {
            const membership = await this.memberRepo.findOne({
                where: {
                    ministry: { id: ministryId, churchId },
                    member: { person: { id: requestPersonId } },
                },
            });
            actingMember = membership;
            if (actingMember) userRole = actingMember.roleInMinistry;
        } catch (e) {
            // Ignore
        }

        const isLeaderOrCoordinator = userRole === MinistryRole.LEADER || userRole === MinistryRole.COORDINATOR;
        const isAssignee = task.assignedTo?.person?.id === requestPersonId;
        const isUnassigned = !task.assignedTo;

        if (!isLeaderOrCoordinator && !isAssignee && !isUnassigned) {
            throw new ForbiddenException('Only the assigned person or a ministry leader can update this task.');
        }

        // Return actingMember if they need to be auto-assigned when picking unassigned task
        return actingMember;
    }

}
