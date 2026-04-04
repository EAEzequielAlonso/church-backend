import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { MinistryRoleAssignment } from '../entities/ministry-role-assignment.entity';
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

        for (const dto of assignments) {
            const dateStr = dto.date.toISOString().split('T')[0];
            const start = new Date(dateStr + 'T00:00:00Z');
            const end = new Date(dateStr + 'T23:59:59.999Z');

            const existing = await this.assignmentRepo.findOne({
                where: {
                    ministryId,
                    roleId: dto.roleId,
                    date: Between(start, end),
                },
            });

            if (existing) {
                existing.personId = dto.personId;
                existing.date = dto.date; // Update the exact time
                existing.metadata = dto.metadata || null;
                if (dto.serviceType) existing.serviceType = dto.serviceType;
                created.push(await this.assignmentRepo.save(existing));
            } else {
                const assignment = this.assignmentRepo.create({
                    ministryId,
                    roleId: dto.roleId,
                    personId: dto.personId,
                    date: dto.date,
                    serviceType: dto.serviceType,
                    metadata: dto.metadata || null,
                });
                created.push(await this.assignmentRepo.save(assignment));
            }
        }

        return created;
    }
}
