import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublicChurchRelation } from 'src/public/church/entities/public_church_relation.entity';
import { PublicChurchRelationStatus } from 'src/public/enums/public.enums';

@Injectable()
export class SmallGroupsPolicies {
  constructor(
    @InjectRepository(PublicChurchRelation)
    private readonly relationRepo: Repository<PublicChurchRelation>,
  ) {}

  /**
   * Verifica si el usuario autenticado tiene el derecho de administrar (crear, modificar, cerrar, eliminar)
   * Small Groups en la iglesia especificada.
   */
  async canManageSmallGroup(personId: string, churchId: string): Promise<void> {
    const relation = await this.relationRepo.findOne({
      where: {
        personId,
        churchId,
        status: PublicChurchRelationStatus.APPROVED,
        isCurrentAdmin: true,
      },
    });

    if (!relation) {
      throw new ForbiddenException(
        'User is not an active administrator for this church.',
      );
    }
  }

  /**
   * Verifica si una persona puede ser asignada como líder de un Small Group.
   * Debe tener una relación activa y aprobada con la misma iglesia.
   */
  async canAssignLeader(leaderId: string, churchId: string): Promise<void> {
    const relation = await this.relationRepo.findOne({
      where: {
        personId: leaderId,
        churchId,
        status: PublicChurchRelationStatus.APPROVED,
      },
    });

    if (!relation) {
      throw new ForbiddenException(
        'The assigned leader does not have an active relation with this church.',
      );
    }
  }
}
