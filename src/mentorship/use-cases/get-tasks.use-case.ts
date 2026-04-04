import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { validate as isUUID } from 'uuid';
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

    // Determinar el rol específico del usuario en ESTE proceso
    const processRole = process.participants?.find(p => p.churchPersonId === executor.userId)?.role;
    const isManager = this.mentorshipPolicy.canManageProcess(executor.userId, executor.roles, process);
    const isParticipant = !!processRole;

    if (!isManager && !isParticipant) {
      throw new ForbiddenException('No tienes permiso para ver las tareas de este proceso.');
    }

    // 2. Query con filtros
    const query = this.taskRepository.createQueryBuilder('task')
      .leftJoinAndSelect('task.meeting', 'meeting')
      .where('task.processId = :processId', { processId });

    // Si es PARTICIPANT (guiado) en este proceso, solo ve sus tareas o grupales
    // Esto aplica incluso si tiene roles globales como COUNSELOR
    if (processRole === 'PARTICIPANT') {
      query.andWhere('(task.assignedChurchPersonId = :userId OR task.assignedChurchPersonId IS NULL OR task.isGroupTask = true)', { userId: executor.userId });
    }

    // Filtros adicionales del DTO
    if (dto.meetingId) {
      if (dto.meetingId === 'none') {
        query.andWhere('task.meetingId IS NULL');
      } else if (isUUID(dto.meetingId)) {
        query.andWhere('task.meetingId = :meetingId', { meetingId: dto.meetingId });
      } else {
        throw new BadRequestException('El meetingId proporcionado no es válido (debe ser UUID o "none").');
      }
    }

    if (dto.status) {
      query.andWhere('task.status = :status', { status: dto.status });
    }

    if (dto.assignedTo) {
      query.andWhere('task.assignedChurchPersonId = :assignedTo', { assignedTo: dto.assignedTo });
    }

    const total = await query.getCount();
    const pageNumber = Math.max(1, dto.page || 1);
    const lastPage = Math.ceil(total / 10);
    
    // Si la página es mayor que la última, ir a la última
    const currentPage = (lastPage > 0 && pageNumber > lastPage) ? lastPage : pageNumber;

    const data = await query
      .orderBy('task.createdAt', 'DESC')
      .addOrderBy('task.id', 'DESC')
      .skip((currentPage - 1) * 10)
      .take(10)
      .getMany();

    return {
      data,
      total,
      page: currentPage,
      lastPage
    };
  }
}
