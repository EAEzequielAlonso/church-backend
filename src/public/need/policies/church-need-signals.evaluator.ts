import { Injectable } from '@nestjs/common';
import { ChurchNeedSignalAction } from '../enums/need-signals.enum';
import { ChurchNeedSignal } from '../entities/church-need-signal.entity';
import {
  NeedSignalStatus,
  NeedSignalCloseReason,
} from '../../enums/public.enums';

export interface ChurchNeedSignalEvaluationContext {
  actorId?: string;
  hasSupported?: boolean;
  hasThirdPartyInfo?: boolean;
}

@Injectable()
export class ChurchNeedSignalEvaluator {
  getAllowedActions(
    signal: ChurchNeedSignal,
    context: ChurchNeedSignalEvaluationContext,
  ): ChurchNeedSignalAction[] {
    const actions: ChurchNeedSignalAction[] = [];

    // PUBLIC: only read, no actions allowed
    if (!context.actorId) {
      return actions;
    }

    const isCreator = signal.personId === context.actorId;

    if (isCreator) {
      // CREADOR
      actions.push(ChurchNeedSignalAction.ADD_INFO);

      if (signal.status === NeedSignalStatus.OPEN) {
        actions.push(ChurchNeedSignalAction.EDIT);
        actions.push(ChurchNeedSignalAction.CLOSE);

        if (!context.hasThirdPartyInfo) {
          actions.push(ChurchNeedSignalAction.DELETE);
        }
      } else if (signal.status === NeedSignalStatus.CLOSED) {
        if (signal.closeReason === NeedSignalCloseReason.TEMPORARY) {
          actions.push(ChurchNeedSignalAction.REOPEN);
        }
      }

      if (signal.status === NeedSignalStatus.OPEN && !context.hasSupported) {
        actions.push(ChurchNeedSignalAction.SUPPORT);
      }
    } else {
      // USUARIO AUTENTICADO NO CREADOR
      actions.push(ChurchNeedSignalAction.ADD_INFO);

      if (signal.status === NeedSignalStatus.OPEN && !context.hasSupported) {
        actions.push(ChurchNeedSignalAction.SUPPORT);
      }
    }

    return actions;
  }
}
