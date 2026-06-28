import { Injectable } from '@nestjs/common';
import { Church } from 'src/core/churches/entities/church.entity';
import { Person } from 'src/core/users/entities/person.entity';
import { MissionProject } from '../entities/mission-project.entity';
import { MissionProjectStatus } from '../enums/missions.enums';
import { ChurchOwnershipService } from '../../church/services/church-ownership.service';

@Injectable()
export class MissionsPolicies {
  constructor(private readonly ownershipService: ChurchOwnershipService) {}

  /**
   * Solo un administrador de la iglesia puede crear una misión.
   */
  async canCreateMission(actor: Person, targetChurchId: string): Promise<boolean> {
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
  async canManageMission(actor: Person, mission: MissionProject, isChurchAdmin?: boolean): Promise<boolean> {
    if (mission.leaderId === actor.id) return true;
    
    if (isChurchAdmin !== undefined) {
      return isChurchAdmin;
    }

    try {
      await this.ownershipService.assertOwnsChurch(actor.id, mission.creatorChurchId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Solo un administrador de otra iglesia puede enviar una colaboración, y la misión debe estar activa.
   */
  async canCollaborate(actor: Person, mission: MissionProject, collaboratorChurchId: string): Promise<boolean> {
    if (mission.status !== MissionProjectStatus.ACTIVE) {
      return false;
    }
    
    try {
      await this.ownershipService.assertOwnsChurch(actor.id, collaboratorChurchId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Mismas reglas de manage: solo lider o admin.
   */
  async canCreateReport(actor: Person, mission: MissionProject, isChurchAdmin?: boolean): Promise<boolean> {
    return this.canManageMission(actor, mission, isChurchAdmin);
  }

  /**
   * Mismas reglas de manage, es una accion critica protegida.
   */
  async canCompleteMission(actor: Person, mission: MissionProject, isChurchAdmin?: boolean): Promise<boolean> {
    return this.canManageMission(actor, mission, isChurchAdmin);
  }
}
