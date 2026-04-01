import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MentorshipTask } from '../entities/mentorship-task.entity';
import { MentorshipService } from '../services/mentorship.service';
import { MentorshipPolicy } from '../policies/mentorship.policy';
import { GetTasksDto } from '../dto/get-tasks.dto';

import { MentorshipVisibilityPolicy } from '../policies/mentorship.visibility-policy';

@Injectable()
export class GetTasksUseCase {
  constructor(
    @InjectRepository(MentorshipTask)
    private readonly taskRepository: Repository<MentorshipTask>,
    private readonly mentorshipService: MentorshipService,
    private readonly mentorshipPolicy: MentorshipPolicy,
    private readonly visibilityPolicy: MentorshipVisibilityPolicy,
  ) {}

  async execute(
    processId: string,
    dto: GetTasksDto,
    executor: {
      userId: string;
      roles: string[];
      permissions?: string[];
      churchId: string;
    },
  ) {
    const process = await this.mentorshipService.findById(processId, executor.churchId);
    if (!process) {
      throw new NotFoundException(`El proceso de mentoría con ID ${processId} no existe.`);
    }

    const isManager = this.mentorshipPolicy.canManageProcess(executor.userId, executor.roles, process);
    const isParticipant = process.participants?.some(p => p.churchPersonId === executor.userId);

    if (!isManager && !isParticipant) {
      throw new ForbiddenException('No tienes permiso para ver las tareas de este proceso.');
    }

    // 2. Query con filtros
    const query = this.taskRepository.createQueryBuilder('task')
      .where('task.processId = :processId', { processId });

    if (!isManager) {
      // Guiados solo ven sus tareas o las grupales
      query.andWhere('(task.assignedChurchPersonId = :userId OR task.assignedChurchPersonId IS NULL)', { userId: executor.userId });
    }

    // Filtros adicionales del DTO
    if (dto.meetingId) {
      query.andWhere('task.meetingId = :meetingId', { meetingId: dto.meetingId });
    }

    if (dto.status) {
      query.andWhere('task.status = :status', { status: dto.status });
    }

    if (dto.assignedTo) {
      // Si el ejecutor es manager, puede filtrar por cualquier asignado.
      // Si es guiado, solo puede filtrar por sí mismo o grupales (pero si pide otro, el filtro de seguridad arriba lo limitará anyway).
      query.andWhere('task.assignedChurchPersonId = :assignedTo', { assignedTo: dto.assignedTo });
    }

    return await query.orderBy('task.dueDate', 'DESC').addOrderBy('task.createdAt', 'DESC').getMany();
  }
}
