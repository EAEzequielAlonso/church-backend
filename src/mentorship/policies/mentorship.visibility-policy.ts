import { Injectable } from '@nestjs/common';
import { MentorshipNote } from '../entities/mentorship-note.entity';
import { MentorshipTask } from '../entities/mentorship-task.entity';
import { MentorshipNoteType, MentorshipRole, MentorshipTaskStatus } from '../enums/mentorship.enum';
import { AppPermission } from '../../auth/authorization/permissions.enum';
import { MentorshipPolicy } from './mentorship.policy';

export interface VisibilityUserContext {
  userId: string;
  churchId: string;
  roles: string[];
  permissions: string[];
}

@Injectable()
export class MentorshipVisibilityPolicy {
  constructor(private readonly mentorshipPolicy: MentorshipPolicy) {}

  canViewNote(user: VisibilityUserContext, note: MentorshipNote): boolean {
    const isManager = this.mentorshipPolicy.canManageProcess(user.userId, user.roles, note.process);
    if (isManager) return true;

    const isSupervisor = user.permissions.includes(AppPermission.COUNSELING_VIEW_SUPERVISION);
    if (isSupervisor) {
      return note.type === MentorshipNoteType.SUPERVISION;
    }

    const isParticipant = note.process?.participants?.some(
      (p) => p.churchPersonId === user.userId && p.role === MentorshipRole.PARTICIPANT
    );
    if (isParticipant) {
      return note.type === MentorshipNoteType.SHARED;
    }

    return false;
  }

  canEditNote(user: VisibilityUserContext, note: MentorshipNote): boolean {
    // Solo mentores/admins pueden editar/borrar
    return this.mentorshipPolicy.canManageProcess(user.userId, user.roles, note.process);
  }

  canDeleteNote(user: VisibilityUserContext, note: MentorshipNote): boolean {
    return this.canEditNote(user, note);
  }

  canAddNote(user: VisibilityUserContext, process: any): boolean {
    return this.mentorshipPolicy.canManageProcess(user.userId, user.roles, process);
  }

  canAddTask(user: VisibilityUserContext, process: any): boolean {
    return this.mentorshipPolicy.canManageProcess(user.userId, user.roles, process);
  }

  canViewTask(user: VisibilityUserContext, task: MentorshipTask): boolean {
    const isManager = this.mentorshipPolicy.canManageProcess(user.userId, user.roles, task.process);
    if (isManager) return true;

    const isAssigned = task.assignedChurchPersonId === user.userId;
    const isParticipant = task.process?.participants?.some((p) => p.churchPersonId === user.userId);
    const isGroupTask = task.isGroupTask;

    return isAssigned || (isGroupTask && isParticipant);
  }

  canStartTask(user: VisibilityUserContext, task: MentorshipTask): boolean {
    return this.canViewTask(user, task) && task.status === MentorshipTaskStatus.ASSIGNED;
  }

  canSubmitTask(user: VisibilityUserContext, task: MentorshipTask): boolean {
    return this.canViewTask(user, task) && task.status === MentorshipTaskStatus.IN_PROGRESS;
  }

  canSaveTaskProgress(user: VisibilityUserContext, task: MentorshipTask): boolean {
    // El guiado puede guardar progreso si puede ver la tarea y está en un estado editable (Asignada o En Progreso)
    return this.canViewTask(user, task) && 
           (task.status === MentorshipTaskStatus.ASSIGNED || task.status === MentorshipTaskStatus.IN_PROGRESS);
  }

  canReviewTask(user: VisibilityUserContext, task: MentorshipTask): boolean {
    // Solo mentores pueden revisar
    return this.mentorshipPolicy.canManageProcess(user.userId, user.roles, task.process) && 
           task.status === MentorshipTaskStatus.SUBMITTED;
  }

  // Utilidad para obtener los tipos de nota visibles para QueryBuilder
  // El rol dentro del proceso (MENTOR/PARTICIPANT) tiene PRIORIDAD sobre roles funcionales globales.
  getVisibleNoteTypes(
    user: VisibilityUserContext,
    isManager: boolean,
    isParticipant: boolean,
    processRole?: MentorshipRole,
  ): MentorshipNoteType[] {
    // 1. Si es guiado (PARTICIPANT) en ESTE proceso → solo SHARED, sin importar roles globales
    if (processRole === MentorshipRole.PARTICIPANT) {
      return [MentorshipNoteType.SHARED];
    }

    // 2. Si es mentor en ESTE proceso O tiene rol global de gestión → todo
    if (processRole === MentorshipRole.MENTOR || isManager) {
      return [MentorshipNoteType.INTERNAL, MentorshipNoteType.SHARED, MentorshipNoteType.SUPERVISION];
    }
    
    // 3. Usuario externo con permiso de supervisión → solo SUPERVISION
    const isSupervisor = user.permissions.includes(AppPermission.COUNSELING_VIEW_SUPERVISION);
    if (isSupervisor) {
      return [MentorshipNoteType.SUPERVISION];
    }

    // 4. Sin acceso
    return [];
  }
}
