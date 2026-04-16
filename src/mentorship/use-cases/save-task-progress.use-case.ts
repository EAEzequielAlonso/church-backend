import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MentorshipTask } from '../entities/mentorship-task.entity';
import { MentorshipPolicy } from '../policies/mentorship.policy';
import { MentorshipVisibilityPolicy, VisibilityUserContext } from '../policies/mentorship.visibility-policy';

@Injectable()
export class SaveTaskProgressUseCase {
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

    const process = task.process;
    this.mentorshipPolicy.assertActive(process.status);

    if (!this.visibilityPolicy.canSaveTaskProgress(executor, task)) {
      if (!this.visibilityPolicy.canViewTask(executor, task)) {
        throw new ForbiddenException('No tienes permiso para ver esta tarea.');
      }
      throw new ForbiddenException('No tienes permiso para guardar progreso en esta tarea en su estado actual.');
    }

    task.menteeResponse = dto.menteeResponse;
    
    return await this.taskRepository.save(task);
  }
}
