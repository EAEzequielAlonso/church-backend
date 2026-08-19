import { Injectable } from '@nestjs/common';
import { MissionProject } from '../entities/mission-project.entity';
import {
  MissionProjectAction,
  MissionProjectStatus,
} from '../enums/missions.enums';
import { MISSION_EDITABLE_STATES } from './mission.constants';

interface MissionEvaluatorContext {
  isMissionManager: boolean;
}

@Injectable()
export class MissionProjectEvaluator {
  /**
   * Determina las acciones permitidas (HATEOAS) sobre una Misión
   * en base a su estado actual y los permisos del actor.
   */
  getAllowedActions(
    mission: MissionProject,
    context: MissionEvaluatorContext,
  ): MissionProjectAction[] {
    const actions: MissionProjectAction[] = [];

    // Si no es un manager, no puede accionar a nivel raíz.
    if (!context.isMissionManager) {
      return actions;
    }

    if (MISSION_EDITABLE_STATES.includes(mission.status)) {
      actions.push(MissionProjectAction.EDIT);
    }

    switch (mission.status) {
      case MissionProjectStatus.DRAFT:
        actions.push(MissionProjectAction.ACTIVATE);
        actions.push(MissionProjectAction.DELETE);
        break;

      case MissionProjectStatus.ACTIVE:
        actions.push(MissionProjectAction.PAUSE);
        actions.push(MissionProjectAction.COMPLETE);
        actions.push(MissionProjectAction.CANCEL);
        break;

      case MissionProjectStatus.PAUSED:
        actions.push(MissionProjectAction.RESUME);
        actions.push(MissionProjectAction.CANCEL);
        break;

      case MissionProjectStatus.COMPLETED:
      case MissionProjectStatus.CANCELLED:
        // No hay transiciones de estado permitidas desde estados finales
        break;
    }

    return actions;
  }
}
