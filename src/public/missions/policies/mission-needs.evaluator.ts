import { Injectable } from '@nestjs/common';
import {
  MissionNeedAction,
  MissionProjectStatus,
  MissionNeedStatus,
} from '../enums/missions.enums';
import { MissionProject } from '../entities/mission-project.entity';
import { MissionNeed } from '../entities/mission-need.entity';
import {
  MISSION_ALLOWS_NEED_FULFILLMENT_STATES,
  MISSION_EDITABLE_STATES,
} from './mission.constants';

export interface NeedEvaluationContext {
  isMissionManager: boolean;
  actorId?: string;
}

@Injectable()
export class MissionNeedsEvaluator {
  getAllowedActions(
    mission: MissionProject,
    need: MissionNeed,
    context: NeedEvaluationContext,
  ): MissionNeedAction[] {
    const actions: MissionNeedAction[] = [];
    if (!context.actorId) return actions;

    if (
      context.isMissionManager &&
      MISSION_EDITABLE_STATES.includes(mission.status)
    ) {
      actions.push(MissionNeedAction.EDIT);
      actions.push(MissionNeedAction.DELETE);
    }

    if (
      context.isMissionManager &&
      MISSION_ALLOWS_NEED_FULFILLMENT_STATES.includes(mission.status) &&
      (need.status === MissionNeedStatus.OPEN ||
        need.status === MissionNeedStatus.IN_PROGRESS)
    ) {
      actions.push(MissionNeedAction.FULFILL);
    }

    return actions;
  }
}
