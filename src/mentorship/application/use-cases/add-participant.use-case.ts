import { MentorshipProcess } from '../../infrastructure/entities/mentorship-process.entity';
import { MentorshipProcessParticipant } from '../../infrastructure/entities/mentorship-process-participant.entity';
import { IMentorshipProcessRepository } from '../../domain/repositories/mentorship-process.repository.interface';
import {
  MENTORSHIP_REPOSITORY_TOKEN,
  DOMAIN_EVENT_BUS_TOKEN,
} from '../../domain/constants/injection-tokens';
import { DomainEventBus } from '../../domain/events/domain-event-bus.interface';
import { AddParticipantToProcessDto } from '../dto/mentorship-mutation.dto';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class AddParticipantToProcessUseCase {
  constructor(
    @Inject(MENTORSHIP_REPOSITORY_TOKEN)
    private readonly mentorshipRepository: IMentorshipProcessRepository,
    @Inject(DOMAIN_EVENT_BUS_TOKEN)
    private readonly eventBus: DomainEventBus,
  ) {}

  async execute(dto: AddParticipantToProcessDto): Promise<MentorshipProcess> {
    // 1. Buscar el proceso
    const process = await this.mentorshipRepository.findById(dto.processId);

    if (!process) {
      throw new Error(
        `El proceso de mentoría con ID ${dto.processId} no existe.`,
      );
    }

    // 2. Instanciar participante
    const participant = new MentorshipProcessParticipant();
    participant.churchPersonId = dto.churchPersonId;
    participant.role = dto.role;

    // 3. Delegar responsabilidad de dominio al Agregado Raíz
    // Este método validará si el proceso permite más participantes según su modo (Formal/Informal),
    // y calculará su status (Pending/Accepted) basado en `hasUserAccount`.
    process.addParticipant(participant, dto.hasUserAccount);

    // 4. Persistir estado mutado
    // Persistir cambios
    await this.mentorshipRepository.save(process);

    // Despachar Eventos Acumulados
    await this.eventBus.publishAll(process.pullDomainEvents());

    return process;
  }
}
