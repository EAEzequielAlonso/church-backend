import { MentorshipProcess } from '../../infrastructure/entities/mentorship-process.entity';
import { MentorshipTask } from '../../infrastructure/entities/mentorship-task.entity';
import { IMentorshipProcessRepository } from '../../domain/repositories/mentorship-process.repository.interface';
import {
  MENTORSHIP_REPOSITORY_TOKEN,
  DOMAIN_EVENT_BUS_TOKEN,
} from '../../domain/constants/injection-tokens';
import { DomainEventBus } from '../../domain/events/domain-event-bus.interface';
import { AddTaskDto } from '../dto/mentorship-content.dto';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class AddTaskUseCase {
  constructor(
    @Inject(MENTORSHIP_REPOSITORY_TOKEN)
    private readonly mentorshipRepository: IMentorshipProcessRepository,
    @Inject(DOMAIN_EVENT_BUS_TOKEN)
    private readonly eventBus: DomainEventBus,
  ) {}

  async execute(dto: AddTaskDto): Promise<MentorshipProcess> {
    // 1. Buscar proceso
    const process = await this.mentorshipRepository.findById(dto.processId);

    if (!process) {
      throw new Error(
        `El proceso de mentoría con ID ${dto.processId} no existe.`,
      );
    }

    // 2. Instanciar tarea
    const task = new MentorshipTask();
    task.creatorChurchPersonId = dto.creatorChurchPersonId;
    task.assignedChurchPersonId = dto.assignedChurchPersonId;
    task.isGroupTask = dto.isGroupTask;
    task.meetingId = dto.meetingId;
    task.title = dto.title;
    task.description = dto.description;
    task.dueDate = dto.dueDate;

    // 3. Someter a las reglas de negocio del Dominio
    // El agregado MentorshipProcess se encargará de rechazar la operación
    // si el proceso está en modo INFORMAL, y de validar los estados (No PAUSED, No CLOSED).
    process.addTask(task);

    // 4. Persistir el agregado
    await this.mentorshipRepository.save(process);
    await this.eventBus.publishAll(process.pullDomainEvents());

    return process;
  }
}
