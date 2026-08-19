import { Injectable } from '@nestjs/common';
import { NeedSignalAction } from '../enums/need-signals.enum';
import { NeedSignal } from '../entities/need-signal.entity';
import { NeedSignalStatus } from '../../enums/public.enums';

export interface NeedSignalEvaluationContext {
  actorId?: string;
}

@Injectable()
export class NeedSignalsEvaluator {
  getAllowedActions(
    signal: NeedSignal,
    context: NeedSignalEvaluationContext,
  ): NeedSignalAction[] {
    const actions: NeedSignalAction[] = [];

    // Acciones no permitidas para usuarios no autenticados o que no son el propietario
    if (!context.actorId || signal.personId !== context.actorId) {
      return actions; // Devuelve array vacío
    }

    // El usuario autenticado es el dueño de la NeedSignal
    if (signal.status === NeedSignalStatus.OPEN) {
      actions.push(NeedSignalAction.EDIT);
      actions.push(NeedSignalAction.CLOSE);
    } else if (signal.status === NeedSignalStatus.CLOSED) {
      actions.push(NeedSignalAction.EDIT);
      actions.push(NeedSignalAction.REOPEN);
    }

    return actions;
  }
}
