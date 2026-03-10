import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { MinistryTask } from '../entities/ministry-task.entity';

@Injectable()
export class GetMinistryTasksUseCase {
    constructor(
        @InjectRepository(MinistryTask)
        private readonly taskRepo: Repository<MinistryTask>,
    ) { }

    async execute(ministryId: string, page: number = 1, limit: number = 10, statusFilter?: string) {
        const skip = (page - 1) * limit;

        let whereStatus: any;
        if (statusFilter === 'pending') {
            whereStatus = In(['pending', 'in_progress']);
        } else if (statusFilter === 'finished') {
            whereStatus = In(['completed', 'incomplete', 'cancelled']);
        }

        const [data, total] = await this.taskRepo.findAndCount({
            where: { ministryId, ...(whereStatus ? { status: whereStatus } : {}) },
            relations: ['assignedTo', 'assignedTo.person'],
            order: { dueDate: 'ASC', createdAt: 'DESC' },
            skip,
            take: limit,
        });

        return {
            data,
            total,
            page,
            limit,
        };
    }
}
