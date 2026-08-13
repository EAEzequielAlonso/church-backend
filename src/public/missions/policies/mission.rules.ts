import { Injectable, ConflictException, ForbiddenException } from '@nestjs/common';
import { MissionProject } from '../entities/mission-project.entity';
import { Person } from 'src/core/users/entities/person.entity';
import { MissionProjectStatus } from '../enums/missions.enums';
import { MissionStatePolicy } from './mission-state.policy';
import { MissionPermissions } from './mission.permissions';
import {
  MISSION_ALLOWS_NEEDS_STATES,
  MISSION_ALLOWS_NEED_FULFILLMENT_STATES,
  MISSION_ALLOWS_REPORTS_STATES,
  MISSION_ALLOWS_COLLABORATION_STATES,
  MISSION_EDITABLE_STATES,
} from './mission.constants';

import { MissionNeedsEvaluator } from './mission-needs.evaluator';
import { MissionReportsEvaluator } from './mission-reports.evaluator';
import { MissionCollaborationsEvaluator } from './mission-collaborations.evaluator';
import { MissionProjectEvaluator } from './mission-project.evaluator';
import { MissionNeedAction, MissionReportAction, MissionCollaborationAction, MissionProjectAction } from '../enums/missions.enums';
import { MissionNeed } from '../entities/mission-need.entity';
import { MissionReport } from '../entities/mission-report.entity';
import { MissionCollaboration } from '../entities/mission-collaboration.entity';

@Injectable()
export class MissionRules {
  constructor(
    private readonly statePolicy: MissionStatePolicy,
    private readonly permissions: MissionPermissions,
    private readonly needsEvaluator: MissionNeedsEvaluator,
    private readonly reportsEvaluator: MissionReportsEvaluator,
    private readonly collabsEvaluator: MissionCollaborationsEvaluator,
    private readonly projectEvaluator: MissionProjectEvaluator,
  ) {}

  /**
   * Determina si el actor tiene permiso para crear una misión.
   */
  async assertCanCreate(
    actor: Person,
    targetChurchId: string,
  ): Promise<void> {
    const canCreate = await this.permissions.canCreateMission(actor, targetChurchId);
    if (!canCreate) {
      throw new ForbiddenException('No tienes permiso para crear misiones en esta iglesia');
    }
  }

  /**
   * Determina si el actor tiene permiso para administrar la misión.
   */
  async assertCanManage(
    actor: Person,
    mission: MissionProject,
    isChurchAdmin?: boolean,
  ): Promise<boolean> {
    const canManage = await this.permissions.canManageMission(actor, mission, isChurchAdmin);
    if (!canManage) {
      throw new ForbiddenException('No tienes permiso para gestionar esta misión');
    }
    return true; // Used to help determine context later if needed
  }

  /**
   * Determina si el actor tiene permiso para eliminar la misión.
   */
  async assertCanDelete(
    actor: Person,
    mission: MissionProject,
    isChurchAdmin?: boolean,
  ): Promise<void> {
    const canDelete = await this.permissions.canManageMission(actor, mission, isChurchAdmin);
    if (!canDelete) {
      throw new ForbiddenException('No tienes permiso para eliminar esta misión');
    }
  }
  
  /**
   * Solo evalua el permiso (booleano), útil para HATEOAS
   */
  async canManage(actor: Person, mission: MissionProject, isChurchAdmin?: boolean): Promise<boolean> {
    return this.permissions.canManageMission(actor, mission, isChurchAdmin);
  }

  /**
   * Determina si la misión se encuentra en un estado que permite ser editada.
   */
  assertCanEdit(mission: MissionProject): void {
    if (!MISSION_EDITABLE_STATES.includes(mission.status)) {
      throw new ConflictException(
        `No se puede editar la misión en su estado actual: ${mission.status}`,
      );
    }
  }

  /**
   * Verifica si la misión puede cambiar al nuevo estado.
   */
  assertCanChangeState(
    currentStatus: MissionProjectStatus,
    newStatus: MissionProjectStatus,
  ): void {
    this.statePolicy.validateTransition(currentStatus, newStatus);
  }

  /**
   * Determina si se puede agregar una necesidad a la misión.
   */
  assertCanAddNeed(mission: MissionProject): void {
    if (!MISSION_ALLOWS_NEEDS_STATES.includes(mission.status)) {
      throw new ConflictException(
        `No se pueden agregar necesidades a una misión en estado ${mission.status}`,
      );
    }
  }

  /**
   * Determina si se puede resolver una necesidad de la misión.
   */
  assertCanFulfillNeed(mission: MissionProject): void {
    if (!MISSION_ALLOWS_NEED_FULFILLMENT_STATES.includes(mission.status)) {
      throw new ConflictException(
        `No se pueden resolver necesidades en una misión en estado ${mission.status}`,
      );
    }
  }

  /**
   * Determina si se puede agregar un reporte a la misión.
   */
  assertCanAddReport(mission: MissionProject): void {
    if (!MISSION_ALLOWS_REPORTS_STATES.includes(mission.status)) {
      throw new ConflictException(
        `No se pueden agregar reportes a una misión en estado ${mission.status}`,
      );
    }
  }

  /**
   * Determina si se puede colaborar con la misión.
   */
  assertCanReceiveCollaboration(mission: MissionProject): void {
    if (!MISSION_ALLOWS_COLLABORATION_STATES.includes(mission.status)) {
      throw new ConflictException(
        `La misión no acepta colaboraciones en su estado actual: ${mission.status}`,
      );
    }
  }

  /**
   * Verifica permisos y estado para que un actor pueda enviar una colaboración.
   */
  async assertCanSubmitCollaboration(
    actor: Person,
    mission: MissionProject,
    collaboratorChurchId: string,
  ): Promise<void> {
    this.assertCanReceiveCollaboration(mission);
    
    const hasPermission = await this.permissions.canCollaborate(actor, collaboratorChurchId);
    if (!hasPermission) {
      throw new ForbiddenException('No tienes permiso para colaborar en nombre de esta iglesia');
    }
  }

  /**
   * Verifica permisos para gestionar una colaboración existente (editar datos).
   */
  async assertCanManageCollaboration(
    actor: Person,
    mission: MissionProject,
    collaboratorChurchId: string,
  ): Promise<void> {
    const hasPermission = await this.permissions.canManageCollaboration(
      actor,
      mission,
      collaboratorChurchId,
    );
    if (!hasPermission) {
      throw new ForbiddenException('No tienes permiso para gestionar esta colaboración');
    }
  }

  /**
   * Verifica si el actor puede aprobar o rechazar una colaboración.
   * Solo el administrador de la misión puede hacerlo.
   */
  async assertCanApproveCollaboration(
    actor: Person,
    mission: MissionProject,
  ): Promise<void> {
    await this.assertCanManage(actor, mission);
    this.assertCanReceiveCollaboration(mission);
  }

  /**
   * Verifica si el actor puede retirar (withdraw) una colaboración.
   * Solo la iglesia colaboradora puede retirar su propia colaboración.
   */
  async assertCanWithdrawCollaboration(
    actor: Person,
    collaboratorChurchId: string,
  ): Promise<void> {
    const hasPermission = await this.permissions.canCollaborate(actor, collaboratorChurchId);
    if (!hasPermission) {
      throw new ForbiddenException('No tienes permiso para retirar esta colaboración');
    }
  }

  // ─── Evaluación de Acciones Permitidas (HATEOAS) ──────────────────────────

  getProjectAllowedActions(mission: MissionProject, isMissionManager: boolean): MissionProjectAction[] {
    return this.projectEvaluator.getAllowedActions(mission, { isMissionManager });
  }

  getNeedAllowedActions(actorId: string | undefined, mission: MissionProject, need: MissionNeed, isMissionManager: boolean): MissionNeedAction[] {
    return this.needsEvaluator.getAllowedActions(mission, need, { actorId, isMissionManager });
  }

  getReportAllowedActions(actorId: string | undefined, mission: MissionProject, report: MissionReport, isMissionManager: boolean): MissionReportAction[] {
    return this.reportsEvaluator.getAllowedActions(mission, report, { actorId, isMissionManager });
  }

  getCollaborationAllowedActions(actorId: string | undefined, mission: MissionProject, collab: MissionCollaboration, isMissionManager: boolean, isCollabChurchManager: boolean): MissionCollaborationAction[] {
    return this.collabsEvaluator.getAllowedActions(mission, collab, { actorId, isMissionManager, isCollabChurchManager });
  }
}

