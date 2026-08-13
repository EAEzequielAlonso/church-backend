import { Injectable } from '@nestjs/common';
import { Church } from 'src/core/churches/entities/church.entity';
import { Person } from 'src/core/users/entities/person.entity';
import { MissionProject } from '../entities/mission-project.entity';
import { ChurchOwnershipService } from '../../church/services/church-ownership.service';

@Injectable()
export class MissionPermissions {
  constructor(private readonly ownershipService: ChurchOwnershipService) {}

  /**
   * Solo un administrador de la iglesia puede crear una misión.
   */
  async canCreateMission(
    actor: Person,
    targetChurchId: string,
  ): Promise<boolean> {
    try {
      await this.ownershipService.assertOwnsChurch(actor.id, targetChurchId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Solo el líder de la misión o un admin de la iglesia creadora pueden gestionarla.
   */
  async canManageMission(
    actor: Person,
    mission: MissionProject,
    isChurchAdmin?: boolean,
  ): Promise<boolean> {
    if (mission.leaderId === actor.id) return true;

    if (isChurchAdmin !== undefined) {
      return isChurchAdmin;
    }

    try {
      await this.ownershipService.assertOwnsChurch(
        actor.id,
        mission.creatorChurchId,
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Solo un administrador de otra iglesia puede enviar una colaboración
   * (La regla de que la misión debe estar activa se evalúa en MissionRules).
   */
  async canCollaborate(
    actor: Person,
    collaboratorChurchId: string,
  ): Promise<boolean> {
    try {
      await this.ownershipService.assertOwnsChurch(
        actor.id,
        collaboratorChurchId,
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Un admin de la iglesia colaboradora o un líder de la misión pueden gestionar la colaboración.
   */
  async canManageCollaboration(
    actor: Person,
    mission: MissionProject,
    collaboratorChurchId: string,
  ): Promise<boolean> {
    // Si es el líder de la misión o admin de la iglesia dueña, puede gestionarla.
    if (await this.canManageMission(actor, mission)) {
      return true;
    }

    // O si es admin de la iglesia que colabora
    try {
      await this.ownershipService.assertOwnsChurch(
        actor.id,
        collaboratorChurchId,
      );
      return true;
    } catch {
      return false;
    }
  }
}
