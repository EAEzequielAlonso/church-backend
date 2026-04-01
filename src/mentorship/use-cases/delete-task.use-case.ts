import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { MentorshipService } from '../services/mentorship.service';
import { MentorshipPolicy } from '../policies/mentorship.policy';
import { MentorshipVisibilityPolicy, VisibilityUserContext } from '../policies/mentorship.visibility-policy';

@Injectable()
export class DeleteTaskUseCase {
  constructor(
    private readonly mentorshipService: MentorshipService,
    private readonly mentorshipPolicy: MentorshipPolicy,
    private readonly visibilityPolicy: MentorshipVisibilityPolicy,
  ) {}

  async execute(
    taskId: string,
    executor: VisibilityUserContext,
  ): Promise<void> {
    const task = await this.mentorshipService.findTaskById(taskId, executor.churchId);
    if (!task) {
      throw new NotFoundException(`La tarea con ID ${taskId} no existe.`);
    }

    const process = await this.mentorshipService.findById(task.processId, executor.churchId);
    
    // Policy check: only mentors or authorized users can delete tasks
    if (!this.visibilityPolicy.canAddTask(executor, process)) {
      throw new ForbiddenException('No tienes permisos para eliminar tareas en este proceso.');
    }

    await this.mentorshipService.deleteTask(taskId, executor.churchId);
  }
}
