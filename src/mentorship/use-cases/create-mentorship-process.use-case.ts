import { MentorshipProcess } from '../entities/mentorship-process.entity';
import { MentorshipProcessParticipant } from '../entities/mentorship-process-participant.entity';
import {
  MentorshipRole,
  MentorshipStatus,
  ParticipantStatus,
} from '../enums/mentorship.enum';
import { CreateMentorshipProcessDto } from '../dto/create-mentorship-process.dto';
import { Injectable, ForbiddenException } from '@nestjs/common';
import { FunctionalRole } from '../../common/enums';
import { MentorshipService } from '../services/mentorship.service';
import { MentorshipPolicy } from '../policies/mentorship.policy';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class CreateMentorshipProcessUseCase {
  constructor(
    private readonly mentorshipService: MentorshipService,
    private readonly mentorshipPolicy: MentorshipPolicy,
    private readonly eventEmitter: EventEmitter2,
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
    const isMemberOrHigher = executorFunctionalRoles.length > 0;
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

    // 1. Validar integridad de reglas estructurales
    this.mentorshipPolicy.validateStructuralIntegrity(
      dto.type,
      dto.mentors.length,
      dto.participants.length,
    );

    // 2. Instanciar Entidad TypeORM
    const process = new MentorshipProcess();
    process.churchId = dto.churchId;
    process.type = dto.type;
    process.mode = dto.mode;
    process.motive = dto.motive;
    process.status = MentorshipStatus.ACTIVE;
    process.startDate = new Date();
    process.participants = [];

    // 3. Agregar Mentores Iniciales
    for (const mentorInput of dto.mentors) {
      const mentorParticipant = new MentorshipProcessParticipant();
      mentorParticipant.churchPersonId = mentorInput.churchPersonId;
      mentorParticipant.role = MentorshipRole.MENTOR;
      mentorParticipant.status = this.mentorshipPolicy.calculateParticipantStatus(
        dto.mode,
        MentorshipRole.MENTOR,
        mentorInput.hasUserAccount,
      );
      if (mentorParticipant.status === ParticipantStatus.AUTO_ACCEPTED || mentorParticipant.status === ParticipantStatus.ACCEPTED) {
        mentorParticipant.joinedAt = new Date();
      }
      process.participants.push(mentorParticipant);
    }

    // 4. Agregar Participantes Guiados Iniciales
    for (const participantInput of dto.participants) {
      const guidedParticipant = new MentorshipProcessParticipant();
      guidedParticipant.churchPersonId = participantInput.churchPersonId;
      guidedParticipant.role = MentorshipRole.PARTICIPANT;
      guidedParticipant.status = this.mentorshipPolicy.calculateParticipantStatus(
        dto.mode,
        MentorshipRole.PARTICIPANT,
        participantInput.hasUserAccount,
      );
      if (guidedParticipant.status === ParticipantStatus.AUTO_ACCEPTED || guidedParticipant.status === ParticipantStatus.ACCEPTED) {
        guidedParticipant.joinedAt = new Date();
      }
      process.participants.push(guidedParticipant);
    }

    // 5. Persistir mediante el Servicio
    const savedProcess = await this.mentorshipService.save(process);

    // 6. Disparar Eventos Estándar de NestJS
    this.eventEmitter.emit('MentorshipProcessCreatedEvent', {
      processId: savedProcess.id,
      churchId: savedProcess.churchId,
      type: savedProcess.type,
    });

    return savedProcess;
  }
}
