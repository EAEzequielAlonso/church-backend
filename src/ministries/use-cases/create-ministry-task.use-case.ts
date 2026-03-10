import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MinistryTask } from '../entities/ministry-task.entity';
import { ChurchPerson } from '../../members/entities/church-person.entity';
import { CreateMinistryTaskDto } from '../dto/create-ministry-task.dto';
import { MinistryPolicy } from '../policies/ministry.policy';
import { SystemRole, FunctionalRole } from '../../common/enums';

@Injectable()
export class CreateMinistryTaskUseCase {
    constructor(
        @InjectRepository(MinistryTask)
        private readonly taskRepo: Repository<MinistryTask>,
        private readonly ministryPolicy: MinistryPolicy,
    ) { }

    async execute(
        ministryId: string,
        data: CreateMinistryTaskDto,
        churchId: string,
        requestPersonId: string,
        systemRole: SystemRole,
        functionalRole: FunctionalRole
    ): Promise<MinistryTask> {

        await this.ministryPolicy.assertCanManage(ministryId, requestPersonId, churchId, systemRole, functionalRole);

        const taskData: Partial<MinistryTask> = {
            ...data,
            ministryId,
        };

        if (data.assignedToId) {
            taskData.assignedToId = data.assignedToId;
        }

        const task = this.taskRepo.create(taskData);
        await this.taskRepo.save(task);

        return this.taskRepo.findOne({
            where: { id: task.id },
            relations: ['assignedTo', 'assignedTo.person'],
        });
    }
}
