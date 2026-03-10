import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MinistryTask } from '../entities/ministry-task.entity';
import { MinistryPolicy } from '../policies/ministry.policy';
import { SystemRole, FunctionalRole } from '../../common/enums';

@Injectable()
export class DeleteMinistryTaskUseCase {
    constructor(
        @InjectRepository(MinistryTask)
        private readonly taskRepo: Repository<MinistryTask>,
        private readonly ministryPolicy: MinistryPolicy,
    ) { }

    async execute(
        ministryId: string,
        taskId: string,
        churchId: string,
        requestPersonId: string,
        systemRole: SystemRole,
        functionalRole: FunctionalRole
    ): Promise<MinistryTask> {

        await this.ministryPolicy.assertCanManage(ministryId, requestPersonId, churchId, systemRole, functionalRole);

        const task = await this.taskRepo.findOne({
            where: { id: taskId, ministryId },
        });

        if (!task) throw new NotFoundException('Tarea no encontrada');

        return this.taskRepo.remove(task);
    }
}
