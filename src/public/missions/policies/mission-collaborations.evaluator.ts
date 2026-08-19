import { Injectable } from '@nestjs/common';
import {
  MissionCollaborationAction,
  MissionCollaborationStatus,
} from '../enums/missions.enums';
import { MissionProject } from '../entities/mission-project.entity';
import { MissionCollaboration } from '../entities/mission-collaboration.entity';
import { MISSION_EDITABLE_STATES } from './mission.constants';

export interface CollaborationEvaluationContext {
  isMissionManager: boolean;
  isCollabChurchManager: boolean;
  actorId?: string;
}

@Injectable()
export class MissionCollaborationsEvaluator {
  getAllowedActions(
    mission: MissionProject,
    collab: MissionCollaboration,
    context: CollaborationEvaluationContext,
  ): MissionCollaborationAction[] {
    const actions: MissionCollaborationAction[] = [];
    if (!context.actorId) return actions;

    const missionIsEditable = MISSION_EDITABLE_STATES.includes(mission.status);

    if (context.isMissionManager && missionIsEditable) {
      actions.push(MissionCollaborationAction.DELETE);
      if (collab.status === MissionCollaborationStatus.PENDING) {
        actions.push(MissionCollaborationAction.APPROVE);
        actions.push(MissionCollaborationAction.REJECT);
      }
      if (collab.status === MissionCollaborationStatus.ACTIVE) {
        actions.push(MissionCollaborationAction.REVOKE);
      }
    }

    if (
      context.isCollabChurchManager &&
      (collab.status === MissionCollaborationStatus.PENDING ||
        collab.status === MissionCollaborationStatus.ACTIVE)
    ) {
      actions.push(MissionCollaborationAction.WITHDRAW);
    }

    if (
      (context.isMissionManager || context.isCollabChurchManager) &&
      missionIsEditable
    ) {
      actions.push(MissionCollaborationAction.EDIT);
    }

    // Removing duplicates if any
    return Array.from(new Set(actions));
  }
}
