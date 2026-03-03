import { MentorshipProcess } from '../../infrastructure/entities/mentorship-process.entity';
import { MentorshipProcessParticipant } from '../../infrastructure/entities/mentorship-process-participant.entity';
import {
  MentorshipRole,
  MentorshipStatus,
} from '../../domain/enums/mentorship.enum';
import { IMentorshipProcessRepository } from '../../domain/repositories/mentorship-process.repository.interface';
import {
  MENTORSHIP_REPOSITORY_TOKEN,
  DOMAIN_EVENT_BUS_TOKEN,
} from '../../domain/constants/injection-tokens';
import { DomainEventBus } from '../../domain/events/domain-event-bus.interface';
import { CreateMentorshipProcessDto } from '../dto/create-mentorship-process.dto';
import { Inject, Injectable, ForbiddenException } from '@nestjs/common';
import { FunctionalRole } from '../../../common/enums';

@Injectable()
export class CreateMentorshipProcessUseCase {
  constructor(
    @Inject(MENTORSHIP_REPOSITORY_TOKEN)
    private readonly mentorshipRepository: IMentorshipProcessRepository,
    @Inject(DOMAIN_EVENT_BUS_TOKEN)
    private readonly eventBus: DomainEventBus,
  ) {}

  /**
   * Ejecuta el caso de uso para crear un proceso de Mentoría (Discipulado o Consejería)
   */
  async execute(
    dto: CreateMentorshipProcessDto,
    executorFunctionalRoles: string[] = [],
    executorChurchPersonId?: string,
  ): Promise<MentorshipProcess> {
    // --- 0. Validación de Permisos de Creación ---
    const isAdminOrAuditor =
      executorFunctionalRoles.includes(FunctionalRole.ADMIN_CHURCH) ||
      executorFunctionalRoles.includes(FunctionalRole.AUDITOR);
    const isMemberOrHigher = executorFunctionalRoles.length > 0; // If they have any role, they are at least MEMBERS in this system's enum construct. But to be safe:
    const hasMemberAccess =
      isMemberOrHigher ||
      executorFunctionalRoles.includes(FunctionalRole.MEMBER);

    if (dto.mode === 'FORMAL') {
      if (
        dto.type === 'DISCIPLESHIP' &&
        !isAdminOrAuditor &&
        !executorFunctionalRoles.includes(FunctionalRole.DISCIPLER)
      ) {
        throw new ForbiddenException(
          'No tienes permisos suficientes para crear un Discipulado Formal. Requiere rol: DISCIPLER.',
        );
      }
      if (
        dto.type === 'COUNSELING' &&
        !isAdminOrAuditor &&
        !executorFunctionalRoles.includes(FunctionalRole.COUNSELOR)
      ) {
        throw new ForbiddenException(
          'No tienes permisos suficientes para crear una Consejería Formal. Requiere rol: COUNSELOR.',
        );
      }
    } else if (dto.mode === 'INFORMAL' || dto.type === 'FOLLOW_UP') {
      if (!hasMemberAccess) {
        throw new ForbiddenException(
          'Solo los miembros de la iglesia pueden iniciar seguimientos o procesos informales.',
        );
      }
    }
    // 1. Instanciar el Agregado Raíz Puro
    const process = new MentorshipProcess();
    process.churchId = dto.churchId;
    process.type = dto.type;
    process.mode = dto.mode;
    process.motive = dto.motive;
    process.status = MentorshipStatus.ACTIVE;
    process.startDate = new Date(); // Asumimos que inicia activo inmediatamente

    // 2. Agregar Mentores Iniciales
    for (const mentorInput of dto.mentors) {
      const mentorParticipant = new MentorshipProcessParticipant();
      mentorParticipant.churchPersonId = mentorInput.churchPersonId;
      mentorParticipant.role = MentorshipRole.MENTOR;

      // Los mentores se auto-aceptan, por lo que su hasUserAccount en el agregado no los dejará PENDING
      process.addParticipant(mentorParticipant, mentorInput.hasUserAccount);
    }

    // 3. Agregar Participantes Guiados Iniciales
    for (const participantInput of dto.participants) {
      const guidedParticipant = new MentorshipProcessParticipant();
      guidedParticipant.churchPersonId = participantInput.churchPersonId;
      guidedParticipant.role = MentorshipRole.PARTICIPANT;

      // En base a hasUserAccount, addParticipant decidirá si es PENDING o AUTO_ACCEPTED (en FORMAL)
      process.addParticipant(
        guidedParticipant,
        participantInput.hasUserAccount,
      );
    }

    // 4. Validar integridad de reglas estructurales del dominio
    // (Ej: Cantidad de mentores/discordantes permitidos según el modo FORMAL/INFORMAL)
    process.validateStructuralIntegrity();

    // 5. Persistir mediante el Puerto del Repositorio
    // El repositorio se encargará de guardar en cascada a los participantes
    // Persistir (Transaccional según cascade del Repo)
    await this.mentorshipRepository.save(process);

    // Disparar Eventos de Dominio (Ej. MentorshipProcessCreatedEvent)
    await this.eventBus.publishAll(process.pullDomainEvents());

    return process;
  }
}
