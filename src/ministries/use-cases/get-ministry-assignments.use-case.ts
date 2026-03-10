import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MinistryRoleAssignment } from '../entities/ministry-role-assignment.entity';

@Injectable()
export class GetMinistryAssignmentsUseCase {
    constructor(
        @InjectRepository(MinistryRoleAssignment)
        private readonly assignmentRepo: Repository<MinistryRoleAssignment>,
    ) { }

    async execute(ministryId: string, fromDate?: string, toDate?: string): Promise<MinistryRoleAssignment[]> {
        const query = this.assignmentRepo
            .createQueryBuilder('assignment')
            .leftJoinAndSelect('assignment.role', 'role')
            .leftJoinAndSelect('assignment.person', 'person') // Generic User/Person
            .where('assignment.ministryId = :ministryId', { ministryId });

        if (fromDate) {
            query.andWhere('assignment.date >= :fromDate', { fromDate });
        }
        if (toDate) {
            query.andWhere('assignment.date <= :toDate', { toDate });
        }

        return query
            .orderBy('assignment.date', 'ASC')
            .addOrderBy('role.name', 'ASC')
            .getMany();
    }
}
