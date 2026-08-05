import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublicChurchRelation } from '../entities/public_church_relation.entity';
import {
  PublicChurchRelationStatus,
  PublicChurchRelationType,
} from '../../enums/public.enums';

@Injectable()
export class ChurchOwnershipService {
  constructor(
    @InjectRepository(PublicChurchRelation)
    private readonly relations: Repository<PublicChurchRelation>,
  ) {}

  async getOwnedChurchIds(personId: string) {
    const adminRelations = await this.relations.find({
      where: {
        personId,
        relationType: PublicChurchRelationType.COMMUNITY_MEMBER,
        status: PublicChurchRelationStatus.APPROVED,
        isCurrentAdmin: true,
      },
    });
    return adminRelations
      .map((x) => x.churchId)
      .filter((id): id is string => id !== null);
  }

  async assertOwnsChurch(personId: string, churchId: string | null) {
    if (!churchId)
      throw new ForbiddenException('Relation is not bound to a church');
    const relation = await this.relations.findOne({
      where: {
        churchId,
        personId,
        relationType: PublicChurchRelationType.COMMUNITY_MEMBER,
        status: PublicChurchRelationStatus.APPROVED,
        isCurrentAdmin: true,
      },
    });
    if (!relation) throw new ForbiddenException('Not owner of claimed church');
  }

  async getAdminsOfChurch(churchId: string): Promise<string[]> {
    const adminRelations = await this.relations.find({
      where: {
        churchId,
        relationType: PublicChurchRelationType.COMMUNITY_MEMBER,
        status: PublicChurchRelationStatus.APPROVED,
        isCurrentAdmin: true,
      },
    });
    return adminRelations.map((x) => x.personId);
  }
}
