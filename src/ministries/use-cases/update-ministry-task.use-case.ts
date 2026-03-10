import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MinistryTask } from '../entities/ministry-task.entity';
import { UpdateMinistryTaskDto } from '../dto/update-ministry-task.dto';
import { MinistryPolicy } from '../policies/ministry.policy';
import { SystemRole, FunctionalRole } from '../../common/enums';

@Injectable()
export class UpdateMinistryTaskUseCase {
    constructor(
        @InjectRepository(MinistryTask)
        private readonly taskRepo: Repository<MinistryTask>,
        private readonly ministryPolicy: MinistryPolicy,
    ) { }

    async execute(
        taskId: string,
        data: UpdateMinistryTaskDto,
        requestPersonId: string,
        systemRole: SystemRole,
        functionalRole: FunctionalRole
    ): Promise<MinistryTask> {

        const task = await this.taskRepo.findOne({
            where: { id: taskId },
            relations: ['ministry', 'ministry.church', 'assignedTo', 'assignedTo.person'],
        });

        if (!task) throw new NotFoundException('Tarea no encontrada');

        // Policy Check specifically for tasks
        const actingMember = await this.ministryPolicy.assertCanUpdateTask(
            task,
            requestPersonId,
            systemRole,
            functionalRole,
        );

        // If an unassigned task is taken by an unprivileged acting member, auto-assign it
        if (actingMember && !task.assignedToId) {
            task.assignedToId = actingMember.member.id;
        }

        Object.assign(task, data);
        await this.taskRepo.save(task);

        return this.taskRepo.findOne({
            where: { id: task.id },
            relations: ['assignedTo', 'assignedTo.person'],
        });
    }
}
