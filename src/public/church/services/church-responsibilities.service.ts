import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';

@Injectable()
export class ChurchResponsibilitiesService {
  /**
   * Valida que una persona no tenga responsabilidades institucionales activas
   * dentro de una iglesia antes de realizar acciones destructivas (ej. remover membresía).
   */
  async assertPersonHasNoActiveResponsibilities(
    manager: EntityManager,
    personId: string,
    churchId: string,
  ): Promise<void> {
    // 1. Validar Grupos Pequeños (Small Groups)
    // Se considera responsabilidad activa cualquier grupo que no esté CERRADO.
    const activeGroupsCount = await manager
      .getRepository('small_groups')
      .count({
        where: {
          leaderId: personId,
          churchId,
          status: In(['ACTIVE', 'PAUSED']),
        },
      });

    if (activeGroupsCount > 0) {
      throw new BadRequestException(
        `Esta persona posee responsabilidades activas (líder de ${activeGroupsCount} grupo(s) pequeño(s)). Reasigna el liderazgo o cierra los grupos antes de remover su membresía.`,
      );
    }

    // Futuras validaciones a incorporar aquí:
    // 2. Misiones (Missions)
    // 3. Ministerios (Ministries)
    // 4. Eventos (Events)
    // 5. Administradores (esto ya se maneja en el flag isCurrentAdmin de la relación por ahora)
  }
}
