import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { MentorshipService } from '../services/mentorship.service';
import { MentorshipPolicy } from '../policies/mentorship.policy';
import { MentorshipVisibilityPolicy, VisibilityUserContext } from '../policies/mentorship.visibility-policy';
import { AddTaskDto } from '../dto/mentorship-content.dto';

@Injectable()
export class UpdateTaskUseCase {
  constructor(
    private readonly mentorshipService: MentorshipService,
    private readonly mentorshipPolicy: MentorshipPolicy,
    private readonly visibilityPolicy: MentorshipVisibilityPolicy,
  ) {}

  async execute(
    taskId: string,
    dto: Partial<AddTaskDto>,
    executor: VisibilityUserContext,
  ): Promise<any> {
    const task = await this.mentorshipService.findTaskById(taskId, executor.churchId);
    if (!task) {
      throw new NotFoundException(`La tarea con ID ${taskId} no existe.`);
    }

    const process = await this.mentorshipService.findById(task.processId, executor.churchId);
    
    // Policy check: only mentors or authorized users can update tasks
    if (!this.visibilityPolicy.canAddTask(executor, process)) {
      throw new ForbiddenException('No tienes permisos para editar tareas en este proceso.');
    }

    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.mentorInstruction !== undefined) task.mentorInstruction = dto.mentorInstruction;
    if (dto.dueDate !== undefined) task.dueDate = dto.dueDate;
    if (dto.assignedChurchPersonId !== undefined) task.assignedChurchPersonId = dto.assignedChurchPersonId;
    if (dto.isGroupTask !== undefined) task.isGroupTask = dto.isGroupTask;
    if (dto.isGroupTask) task.assignedChurchPersonId = null;
    if (dto.meetingId !== undefined) task.meetingId = dto.meetingId;

    return await this.mentorshipService.saveTask(task);
  }
}
