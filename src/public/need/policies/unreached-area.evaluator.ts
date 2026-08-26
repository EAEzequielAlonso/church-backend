import { Injectable } from '@nestjs/common';
import {
  UnreachedAreaAction,
  UnreachedAreaStatus,
} from '../enums/need-signals.enum';
import { UnreachedArea } from '../entities/unreached-area.entity';
import { AppPermission } from '../../../core/auth/authorization/permissions.enum';

export interface UnreachedAreaEvaluationContext {
  actorId?: string;
  hasPermissions?: (permissions: AppPermission[]) => boolean;
}

@Injectable()
export class UnreachedAreaEvaluator {
  getAllowedActions(
    area: UnreachedArea,
    context: UnreachedAreaEvaluationContext,
  ): UnreachedAreaAction[] {
    const actions: UnreachedAreaAction[] = [];

    // PUBLIC: only read, no actions allowed
    if (!context.actorId) {
      return actions;
    }

    // ALL AUTHENTICATED USERS: can add info
    actions.push(UnreachedAreaAction.ADD_INFO);

    const isCreator = area.reporterPersonId === context.actorId;
    const isAdmin =
      context.hasPermissions?.([AppPermission.NETWORK_ADMINISTRATION]) ?? false;

    if (isCreator || isAdmin) {
      if (area.status === UnreachedAreaStatus.OPEN) {
        actions.push(UnreachedAreaAction.EDIT);
      }

      // Both OPEN and REACHED can be changed back and forth by creator/admin
      actions.push(UnreachedAreaAction.CHANGE_STATUS);
    }

    return actions;
  }
}
