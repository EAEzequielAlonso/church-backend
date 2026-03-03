import { MentorshipProcess } from '../../infrastructure/entities/mentorship-process.entity';
import { IMentorshipProcessRepository } from '../../domain/repositories/mentorship-process.repository.interface';
import {
  MENTORSHIP_REPOSITORY_TOKEN,
  DOMAIN_EVENT_BUS_TOKEN,
} from '../../domain/constants/injection-tokens';
import { DomainEventBus } from '../../domain/events/domain-event-bus.interface';
import { ApproveParticipantDto } from '../dto/mentorship-mutation.dto';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class ApproveParticipantUseCase {
  constructor(
    @Inject(MENTORSHIP_REPOSITORY_TOKEN)
    private readonly mentorshipRepository: IMentorshipProcessRepository,
    @Inject(DOMAIN_EVENT_BUS_TOKEN)
    private readonly eventBus: DomainEventBus,
  ) {}

  async execute(dto: ApproveParticipantDto): Promise<MentorshipProcess> {
    // 1. Buscar el Agregado
    const process = await this.mentorshipRepository.findById(dto.processId);

    if (!process) {
      throw new Error(
        `El proceso de mentoría con ID ${dto.processId} no existe.`,
      );
    }

    // 2. Comandar mutación al dominio
    // El agregado valida internamente si está ACTIVE, si es FORMAL y si el participante estaba PENDING.
    process.approveParticipant(dto.churchPersonId);

    await this.mentorshipRepository.save(process);
    await this.eventBus.publishAll(process.pullDomainEvents());

    return process;
  }
}
