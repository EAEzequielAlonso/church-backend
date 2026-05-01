import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { MentorshipService } from '../services/mentorship.service';
import { MentorshipPolicy } from '../policies/mentorship.policy';
import { MentorshipProcess } from '../entities/mentorship-process.entity';
import { MentorshipTask } from '../entities/mentorship-task.entity';
import { AddTaskDto } from '../dto/mentorship-content.dto';
import { MentorshipVisibilityPolicy, VisibilityUserContext } from '../policies/mentorship.visibility-policy';

@Injectable()
export class AddTaskUseCase {
  constructor(
    private readonly mentorshipService: MentorshipService,
    private readonly mentorshipPolicy: MentorshipPolicy,
    private readonly visibilityPolicy: MentorshipVisibilityPolicy,
  ) {}

  async execute(
    dto: AddTaskDto,
    executor: VisibilityUserContext,
  ): Promise<MentorshipProcess> {
    const process = await this.mentorshipService.findById(dto.processId, executor.churchId);

    if (!process) {
      throw new NotFoundException(`El proceso de mentoría con ID ${dto.processId} no existe.`);
    }

    this.mentorshipPolicy.assertActive(process.status);
    
    if (!this.visibilityPolicy.canAddTask(executor, process)) {
      throw new ForbiddenException('No tienes permisos para añadir tareas a este proceso.');
    }
    this.mentorshipPolicy.validateTaskAssignment(process.mode);

    const creatorId = dto.creatorChurchPersonId || executor.userId;
    if (!creatorId) {
      throw new Error('No se pudo determinar el creador de la tarea (creatorChurchPersonId missing).');
    }

    const task = new MentorshipTask();
    task.creatorChurchPersonId = creatorId;
    task.assignedChurchPersonId = dto.assignedChurchPersonId;
    task.isGroupTask = dto.isGroupTask;
    task.meetingId = dto.meetingId;
    task.title = dto.title;
    task.description = dto.description;
    task.mentorInstruction = dto.mentorInstruction;
    task.dueDate = dto.dueDate;

    if (!process.tasks) {
      process.tasks = [];
    }
    process.tasks.push(task);

    const savedProcess = await this.mentorshipService.save(process);

    return savedProcess;
  }
}
