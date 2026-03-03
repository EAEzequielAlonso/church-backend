import { IMentorshipProcessRepository } from '../../domain/repositories/mentorship-process.repository.interface';
import {
  MENTORSHIP_REPOSITORY_TOKEN,
  DOMAIN_EVENT_BUS_TOKEN,
} from '../../domain/constants/injection-tokens';
import { DomainEventBus } from '../../domain/events/domain-event-bus.interface';
import { HardDeleteMentorshipProcessDto } from '../dto/hard-delete-mentorship.dto';
import {
  MentorshipRole,
  MentorshipStatus,
} from '../../domain/enums/mentorship.enum';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class HardDeleteMentorshipProcessUseCase {
  constructor(
    @Inject(MENTORSHIP_REPOSITORY_TOKEN)
    private readonly mentorshipRepository: IMentorshipProcessRepository,
    @Inject(DOMAIN_EVENT_BUS_TOKEN)
    private readonly eventBus: DomainEventBus,
  ) {}

  async execute(dto: HardDeleteMentorshipProcessDto): Promise<void> {
    // 1. Validar el string de confirmación exacto primero para fallar rápido de forma barata
    if (dto.confirmString !== 'ELIMINAR PROCESO DEFINITIVAMENTE') {
      throw new Error(
        'El string de confirmación es incorrecto. La operación ha sido abortada.',
      );
    }

    // 2. Buscar el proceso
    const process = await this.mentorshipRepository.findById(dto.processId);

    if (!process) {
      throw new Error(
        `El proceso de mentoría con ID ${dto.processId} no existe.`,
      );
    }

    // 3. Verificar Autorización (Reglas de Aplicación para operaciones destructivas no delegables al dominio base)
    const isAdminOrAuditor =
      dto.executorFunctionalRoles.includes('ADMIN_CHURCH') ||
      dto.executorFunctionalRoles.includes('AUDITOR');

    let isMentorOfTheProcess = false;
    if (process.participants) {
      isMentorOfTheProcess = process.participants.some(
        (p) =>
          p.churchPersonId === dto.executorChurchPersonId &&
          p.role === MentorshipRole.MENTOR,
      );
    }

    if (!isAdminOrAuditor && !isMentorOfTheProcess) {
      throw new Error(
        'Permisos insuficientes. Solo un MENTOR asignado al proceso, un ADMIN_CHURCH o un AUDITOR pueden eliminar definitivamente el proceso.',
      );
    }

    // 4. Ejecutar Hard Delete físico en cascada delegando la responsabilidad persistente al Repositorio
    // No hay soft delete ni marcado de fechas. Esto instruye a la BD a suprimir el record y sus `OneToMany` (participants,        // El repositorio ejecuta TypORM .delete() e ignora Cascade de TypeORM que hará DELETE ON CASCADE
    await this.mentorshipRepository.hardDelete(process.id);

    // Despachar Eventos de eliminación recolectados en memory buffer (Ej: ProcessDeletedEvent si lo tuviéramos)
    await this.eventBus.publishAll(process.pullDomainEvents());
  }
}
