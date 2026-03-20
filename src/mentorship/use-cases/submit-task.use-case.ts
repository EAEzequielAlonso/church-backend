import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MentorshipTask } from '../entities/mentorship-task.entity';
import { MentorshipPolicy } from '../policies/mentorship.policy';
import { MentorshipTaskStatus } from '../enums/mentorship.enum';

import { MentorshipVisibilityPolicy, VisibilityUserContext } from '../policies/mentorship.visibility-policy';

@Injectable()
export class SubmitTaskUseCase {
  constructor(
    @InjectRepository(MentorshipTask)
    private readonly taskRepository: Repository<MentorshipTask>,
    private readonly mentorshipPolicy: MentorshipPolicy,
    private readonly visibilityPolicy: MentorshipVisibilityPolicy,
  ) {}

  async execute(
    taskId: string,
    executor: VisibilityUserContext,
    dto: { menteeResponse: string },
  ) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: { process: { participants: true } },
    });

    if (!task) {
      throw new NotFoundException(`La tarea con ID ${taskId} no existe.`);
    }

    if (!dto.menteeResponse || dto.menteeResponse.trim() === '') {
      throw new BadRequestException('Se requiere una respuesta (menteeResponse) para enviar la tarea.');
    }

    const process = task.process;
    this.mentorshipPolicy.assertActive(process.status);

    if (!this.visibilityPolicy.canSubmitTask(executor, task)) {
      if (!this.visibilityPolicy.canViewTask(executor, task)) {
        throw new ForbiddenException('No tienes permiso para ver esta tarea.');
      }
      if (task.status !== MentorshipTaskStatus.IN_PROGRESS) {
        throw new BadRequestException(`No se puede enviar una tarea que está en estado ${task.status}.`);
      }
      throw new ForbiddenException('No tienes permiso para enviar esta tarea.');
    }

    task.status = MentorshipTaskStatus.SUBMITTED;
    task.menteeResponse = dto.menteeResponse;
    
    return await this.taskRepository.save(task);
  }
}
