import { ApiProperty } from '@nestjs/swagger';
import {
  MentorshipType,
  MentorshipMode,
  MentorshipStatus,
  MentorshipRole,
  ParticipantStatus,
  MentorshipNoteType,
} from '../../domain/enums/mentorship.enum';
import { MentorshipProcess } from '../../infrastructure/entities/mentorship-process.entity';
import { AppPermission } from '../../../auth/authorization/permissions.enum';

export class MentorshipParticipantDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  churchPersonId: string;

  @ApiProperty({ enum: MentorshipRole })
  role: MentorshipRole;

  @ApiProperty({ enum: ParticipantStatus })
  status: ParticipantStatus;

  @ApiProperty()
  joinedAt: Date;
}

export class MentorshipMeetingDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  scheduledDate: Date;

  @ApiProperty({ required: false })
  endDate?: Date;

  @ApiProperty({ required: false })
  title?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  color?: string;

  @ApiProperty({ required: false })
  location?: string;

  @ApiProperty()
  isCompleted: boolean;
}

export class MentorshipNoteDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  authorChurchPersonId: string;

  @ApiProperty({ enum: MentorshipNoteType })
  type: MentorshipNoteType;

  @ApiProperty()
  content: string;

  @ApiProperty()
  createdAt: Date;
}

export class MentorshipTaskDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  creatorChurchPersonId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  isCompleted: boolean;

  @ApiProperty({ required: false })
  dueDate?: Date;
}

export class MentorshipResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: MentorshipType })
  type: MentorshipType;

  @ApiProperty({ enum: MentorshipMode })
  mode: MentorshipMode;

  @ApiProperty({ enum: MentorshipStatus })
  status: MentorshipStatus;

  @ApiProperty({ required: false })
  startDate?: Date;

  @ApiProperty({ required: false })
  endDate?: Date;

  @ApiProperty()
  churchId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: [MentorshipParticipantDto] })
  participants: MentorshipParticipantDto[];

  @ApiProperty({ type: [MentorshipMeetingDto] })
  meetings: MentorshipMeetingDto[];

  @ApiProperty({ type: [MentorshipNoteDto] })
  notes: MentorshipNoteDto[];

  @ApiProperty({ type: [MentorshipTaskDto] })
  tasks: MentorshipTaskDto[];

  /**
   * Mapper estático para desligar la Entidad Base de Datos TypeORM del contrato de respuesta,
   * y realizar filtrado de limpieza basado en roles y permisos.
   */
  static fromEntity(
    entity: MentorshipProcess,
    options?: {
      userChurchPersonId?: string;
      userPermissions?: AppPermission[];
    },
  ): MentorshipResponseDto {
    const dto = new MentorshipResponseDto();
    dto.id = entity.id;
    dto.type = entity.type;
    dto.mode = entity.mode;
    dto.status = entity.status;
    dto.startDate = entity.startDate;
    dto.endDate = entity.endDate;
    dto.churchId = entity.churchId;
    dto.createdAt = entity.createdAt || new Date(); // Fallback in case it's not loaded
    dto.updatedAt = entity.updatedAt || new Date();

    dto.participants = (entity.participants || []).map((p) => ({
      id: p.id,
      churchPersonId: p.churchPersonId,
      role: p.role,
      status: p.status,
      joinedAt: p.joinedAt,
    }));

    dto.meetings = (entity.meetings || []).map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      color: m.color,
      scheduledDate: m.scheduledDate,
      endDate: m.endDate,
      location: m.location,
      isCompleted: m.isCompleted,
    }));

    // ==========================================
    // Lógica de Filtrado de Visibilidad de Notas
    // ==========================================
    const permissions = options?.userPermissions || [];
    const isSupervisor = permissions.includes(
      AppPermission.COUNSELING_VIEW_SUPERVISION,
    );

    let isParticipant = false;
    let isMentor = false;

    if (options?.userChurchPersonId) {
      const roleInProcess = entity.participants?.find(
        (p) => p.churchPersonId === options.userChurchPersonId,
      )?.role;
      if (roleInProcess) {
        isParticipant = true;
        if (roleInProcess === MentorshipRole.MENTOR) isMentor = true;
      }
    }

    const filteredNotes = (entity.notes || []).filter((n) => {
      // Mentor del proceso ve todo menos sus notas personales si el autor es otro mentor.
      if (isMentor) {
        // Puede ver todas menos las notas personales de OTROS mentores
        if (
          n.type === MentorshipNoteType.PERSONAL &&
          n.authorChurchPersonId !== options?.userChurchPersonId
        )
          return false;
        return true;
      }

      // Participante (Aconsejado / Discipulo) del proceso:
      if (isParticipant && !isMentor) {
        // Solo ve notas compartidas
        return n.type === MentorshipNoteType.SHARED;
      }

      // Supervisor (que NO participa en el proceso):
      if (isSupervisor) {
        return n.type === MentorshipNoteType.SUPERVISION;
      }

      // Usuario sin rol explícito aquí
      return false;
    });

    dto.notes = filteredNotes.map((n) => ({
      id: n.id,
      authorChurchPersonId: n.authorChurchPersonId,
      type: n.type,
      content: n.content,
      createdAt: n.createdAt,
    }));

    dto.tasks = (entity.tasks || []).map((t) => ({
      id: t.id,
      creatorChurchPersonId: t.creatorChurchPersonId,
      title: t.title,
      isCompleted: t.isCompleted,
      dueDate: t.dueDate,
    }));

    return dto;
  }
}
