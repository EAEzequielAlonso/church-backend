import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  MentorshipType,
  MentorshipMode,
  MentorshipStatus,
  MentorshipRole,
  ParticipantStatus,
  MentorshipNoteType,
} from '../enums/mentorship.enum';
import { MentorshipProcess } from '../entities/mentorship-process.entity';
import { FunctionalRole } from '../../common/enums';

@Injectable()
export class MentorshipPolicy {
  canManageProcess(
    userId: string,
    roles: string[],
    process: MentorshipProcess,
  ): boolean {
    // 1. Roles globales permitidos
    const hasGlobalPermission = roles.some(
      (role) =>
        role === FunctionalRole.ADMIN_CHURCH || role === FunctionalRole.COUNSELOR,
    );
    if (hasGlobalPermission) return true;

    // 2. ¿Es el mentor asignado de este proceso específico?
    return (
      process.participants?.some(
        (p) => p.churchPersonId === userId && p.role === MentorshipRole.MENTOR,
      ) ?? false
    );
  }

  assertCanManage(
    userId: string,
    roles: string[],
    process: MentorshipProcess,
  ) {
    if (!this.canManageProcess(userId, roles, process)) {
      throw new ForbiddenException(
        'No tienes permisos para gestionar este proceso de mentoría.',
      );
    }
  }

  assertNotClosed(status: MentorshipStatus) {
    if (status === MentorshipStatus.CLOSED) {
      throw new BadRequestException('El proceso de mentoría está cerrado y es inmutable.');
    }
  }

  assertActive(status: MentorshipStatus) {
    this.assertNotClosed(status);
    if (status === MentorshipStatus.PAUSED) {
      throw new BadRequestException(
        'El proceso de mentoría está pausado. No se pueden realizar modificaciones sin antes activarlo.',
      );
    }
  }

  validateStatusChange(newStatus: MentorshipStatus, closeObservation?: string) {
    if (newStatus === MentorshipStatus.CLOSED) {
      if (!closeObservation || closeObservation.trim() === '') {
        throw new BadRequestException(
          'Es obligatoria una observación (closeObservation) para cerrar un proceso.',
        );
      }
    }
  }

  validateParticipantAddition(
    type: MentorshipType,
    role: MentorshipRole,
    currentMentorsCount: number,
    currentMenteesCount: number,
  ) {
    if (type === MentorshipType.FOLLOW_UP) {
      if (role === MentorshipRole.MENTOR && currentMentorsCount >= 1) {
        throw new BadRequestException('Un proceso de SEGUIMIENTO solo puede tener exactamente 1 guía.');
      }
      if (role === MentorshipRole.PARTICIPANT && currentMenteesCount >= 1) {
        throw new BadRequestException('Un proceso de SEGUIMIENTO solo puede tener como máximo 1 guiado.');
      }
    }
  }

  calculateParticipantStatus(
    mode: MentorshipMode,
    role: MentorshipRole,
    hasUserAccount: boolean,
  ): ParticipantStatus {
    if (mode === MentorshipMode.INFORMAL) {
      return ParticipantStatus.AUTO_ACCEPTED;
    } else {
      // FORMAL mode
      if (role === MentorshipRole.PARTICIPANT) {
        return hasUserAccount ? ParticipantStatus.PENDING : ParticipantStatus.AUTO_ACCEPTED;
      } else {
        return ParticipantStatus.AUTO_ACCEPTED;
      }
    }
  }

  validateStructuralIntegrity(type: MentorshipType, mentorsCount: number, menteesCount: number) {
    if (mentorsCount < 1 || menteesCount < 1) {
      throw new BadRequestException(
        'Un proceso debe tener al menos 1 mentor y 1 participante activo.',
      );
    }
    if (type === MentorshipType.FOLLOW_UP) {
      if (mentorsCount !== 1) {
        throw new BadRequestException('Un proceso de SEGUIMIENTO debe tener exactamente 1 mentor.');
      }
      if (menteesCount > 1) {
        throw new BadRequestException('Un proceso de SEGUIMIENTO solo permite un máximo de 1 participante.');
      }
    }
  }

  validateTaskAssignment(mode: MentorshipMode) {
    if (mode === MentorshipMode.INFORMAL) {
      throw new BadRequestException('No se pueden asignar tareas en un proceso de modo INFORMAL.');
    }
  }

  validateNoteAddition(mode: MentorshipMode, noteType: MentorshipNoteType) {
    if (mode === MentorshipMode.INFORMAL && noteType !== MentorshipNoteType.INTERNAL) {
      throw new BadRequestException('En un proceso INFORMAL solo se permiten notas de tipo INTERNAL.');
    }
  }
}
