import { MentorshipProcess } from '../../infrastructure/entities/mentorship-process.entity';
import { IMentorshipProcessRepository } from '../../domain/repositories/mentorship-process.repository.interface';
import {
  MENTORSHIP_REPOSITORY_TOKEN,
  DOMAIN_EVENT_BUS_TOKEN,
} from '../../domain/constants/injection-tokens';
import { DomainEventBus } from '../../domain/events/domain-event-bus.interface';
import { ChangeMentorshipStatusDto } from '../dto/mentorship-mutation.dto';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class ChangeMentorshipStatusUseCase {
  constructor(
    @Inject(MENTORSHIP_REPOSITORY_TOKEN)
    private readonly mentorshipRepository: IMentorshipProcessRepository,
    @Inject(DOMAIN_EVENT_BUS_TOKEN)
    private readonly eventBus: DomainEventBus,
  ) {}

  async execute(dto: ChangeMentorshipStatusDto): Promise<MentorshipProcess> {
    // 1. Obtención
    const process = await this.mentorshipRepository.findById(dto.processId);

    if (!process) {
      throw new Error(
        `El proceso de mentoría con ID ${dto.processId} no existe.`,
      );
    }

    // 2. Mutación de dominio controlada
    // El agregado se encarga de rebotar si ya estaba en CLOSED
    // y de exigir observation si el `newStatus` transiciona a CLOSED.
    process.changeStatus(dto.newStatus, dto.closeObservation);

    // 3. Persistencia
    await this.mentorshipRepository.save(process);
    await this.eventBus.publishAll(process.pullDomainEvents());

    return process;
  }
}
