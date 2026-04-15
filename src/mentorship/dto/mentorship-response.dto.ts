import { ApiProperty } from '@nestjs/swagger';
import {
  MentorshipType,
  MentorshipMode,
  MentorshipStatus,
  MentorshipRole,
  ParticipantStatus,
  MentorshipNoteType,
  MentorshipTaskStatus,
} from '../enums/mentorship.enum';
import { MentorshipProcess } from '../entities/mentorship-process.entity';
import { AppPermission } from '../../auth/authorization/permissions.enum';

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

  @ApiProperty({ required: false })
  name?: string;
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

  @ApiProperty({ required: false })
  title?: string;

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

  @ApiProperty({ enum: MentorshipTaskStatus })
  status: MentorshipTaskStatus;

  @ApiProperty({ required: false })
  mentorInstruction?: string;

  @ApiProperty({ required: false })
  menteeResponse?: string;

  @ApiProperty({ required: false })
  mentorFeedback?: string;

  @ApiProperty({ required: false })
  dueDate?: Date;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  assignedChurchPersonId?: string;

  @ApiProperty()
  isGroupTask: boolean;

  @ApiProperty({ required: false })
  meetingId?: string;
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
  motive?: string;

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

  @ApiProperty({ required: false })
  mentorSummary?: string;

  @ApiProperty({ required: false })
  menteeSummary?: string;

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
    dto.motive = entity.motive;
    dto.startDate = entity.startDate;
    dto.endDate = entity.endDate;
    dto.churchId = entity.churchId;
    dto.createdAt = entity.createdAt || new Date(); // Fallback in case it's not loaded
    dto.updatedAt = entity.updatedAt || new Date();

    dto.participants = (entity.participants || []).map((p) => {
      const person = p.churchPerson?.person;
      const fullName = person
        ? `${person.firstName || ''} ${person.lastName || ''}`.trim()
        : 'S/N';

      return {
        id: p.id,
        churchPersonId: p.churchPersonId,
        role: p.role,
        status: p.status,
        joinedAt: p.joinedAt,
        name: fullName,
      };
    });

    // Helper to build participant summary
    const buildSummary = (parts: any[]) => {
      if (!parts || parts.length === 0) return null;
      const firstPerson = parts[0].name;
      if (parts.length === 1) return firstPerson;
      return `${firstPerson} +${parts.length - 1}`;
    };

    const mentors = dto.participants.filter(
      (p) => p.role === MentorshipRole.MENTOR,
    );
    const mentees = dto.participants.filter(
      (p) => p.role === MentorshipRole.PARTICIPANT,
    );

    dto.mentorSummary = buildSummary(mentors) || 'Sin Asignar';
    dto.menteeSummary = buildSummary(mentees) || 'Varios/Ninguno';

    dto.meetings = (entity.meetings || []).map((m) => ({
      id: m.id,
      title: m.calendarEvent?.title,
      description: m.calendarEvent?.description,
      color: m.calendarEvent?.color,
      scheduledDate: m.calendarEvent?.startDate,
      endDate: m.calendarEvent?.endDate,
      location: m.calendarEvent?.location,
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
      // Mentor del proceso ve todo menos sus propias notas internas si el autor es otro mentor.
      if (isMentor) {
        // Puede ver todas menos las notas internas de OTROS mentores
        if (
          n.type === MentorshipNoteType.INTERNAL &&
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
      title: n.title,
      type: n.type,
      content: n.content,
      createdAt: n.createdAt,
    }));

    dto.tasks = (entity.tasks || []).map((t) => ({
      id: t.id,
      creatorChurchPersonId: t.creatorChurchPersonId,
      title: t.title,
      status: t.status,
      mentorInstruction: t.mentorInstruction,
      menteeResponse: t.menteeResponse,
      mentorFeedback: t.mentorFeedback,
      dueDate: t.dueDate,
      description: t.description,
      assignedChurchPersonId: t.assignedChurchPersonId,
      isGroupTask: t.isGroupTask,
      meetingId: t.meetingId,
    }));

    return dto;
  }
}
