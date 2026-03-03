import { MentorshipProcess } from '../../infrastructure/entities/mentorship-process.entity';
import { MentorshipNote } from '../../infrastructure/entities/mentorship-note.entity';
import { IMentorshipProcessRepository } from '../../domain/repositories/mentorship-process.repository.interface';
import {
  MENTORSHIP_REPOSITORY_TOKEN,
  DOMAIN_EVENT_BUS_TOKEN,
} from '../../domain/constants/injection-tokens';
import { DomainEventBus } from '../../domain/events/domain-event-bus.interface';
import { AddNoteDto } from '../dto/mentorship-content.dto';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class AddNoteUseCase {
  constructor(
    @Inject(MENTORSHIP_REPOSITORY_TOKEN)
    private readonly mentorshipRepository: IMentorshipProcessRepository,
    @Inject(DOMAIN_EVENT_BUS_TOKEN)
    private readonly eventBus: DomainEventBus,
  ) {}

  async execute(dto: AddNoteDto): Promise<MentorshipProcess> {
    // 1. Obtener el proceso
    const process = await this.mentorshipRepository.findById(dto.processId);

    if (!process) {
      throw new Error(
        `El proceso de mentoría con ID ${dto.processId} no existe.`,
      );
    }

    // 2. Instanciar la nota sin lógica de reglas
    const note = new MentorshipNote();
    note.authorChurchPersonId = dto.authorChurchPersonId;
    note.meetingId = dto.meetingId;
    note.type = dto.type;
    note.content = dto.content;

    // 3. Validar reglas de dominio mediante el Agregado
    // MentorshipProcess validará que si es modo INFORMAL solo acepte PERSONAL.
    // Y como rehusamos lógica, también validará que no esté PAUSED o CLOSED por defecto.
    process.addNote(note);

    // 4. Persistir la mutación
    await this.mentorshipRepository.save(process);
    await this.eventBus.publishAll(process.pullDomainEvents());

    return process;
  }
}
