import { Injectable } from '@nestjs/common';
import { MissionReportAction } from '../enums/missions.enums';
import { MissionProject } from '../entities/mission-project.entity';
import { MissionReport } from '../entities/mission-report.entity';
import { MISSION_EDITABLE_STATES } from './mission.constants';

export interface ReportEvaluationContext {
  isMissionManager: boolean;
  actorId?: string;
}

@Injectable()
export class MissionReportsEvaluator {
  getAllowedActions(
    mission: MissionProject,
    report: MissionReport,
    context: ReportEvaluationContext,
  ): MissionReportAction[] {
    const actions: MissionReportAction[] = [];
    if (!context.actorId) return actions;

    if (
      context.isMissionManager &&
      MISSION_EDITABLE_STATES.includes(mission.status)
    ) {
      actions.push(MissionReportAction.EDIT);
      actions.push(MissionReportAction.DELETE);
    }

    return actions;
  }
}
