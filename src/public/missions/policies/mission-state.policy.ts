import { Injectable, ConflictException } from '@nestjs/common';
import { MissionProjectStatus } from '../enums/missions.enums';

@Injectable()
export class MissionStatePolicy {
  /**
   * Valida si una transición de estado es válida según las reglas del dominio.
   * Lanza una excepción si la transición no está permitida.
   *
   * @param currentStatus El estado actual de la misión
   * @param newStatus El nuevo estado al que se desea pasar
   */
  validateTransition(
    currentStatus: MissionProjectStatus,
    newStatus: MissionProjectStatus,
  ): void {
    if (currentStatus === newStatus) {
      return; // No hay cambio
    }

    const validTransitions: Record<MissionProjectStatus, MissionProjectStatus[]> = {
      [MissionProjectStatus.DRAFT]: [MissionProjectStatus.ACTIVE],
      [MissionProjectStatus.ACTIVE]: [
        MissionProjectStatus.PAUSED,
        MissionProjectStatus.COMPLETED,
        MissionProjectStatus.CANCELLED,
      ],
      [MissionProjectStatus.PAUSED]: [
        MissionProjectStatus.ACTIVE,
        MissionProjectStatus.CANCELLED,
      ],
      [MissionProjectStatus.COMPLETED]: [], // Estado final
      [MissionProjectStatus.CANCELLED]: [], // Estado final
    };

    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new ConflictException(
        `Transición de estado inválida: no se puede pasar de ${currentStatus} a ${newStatus}.`,
      );
    }
  }
}
