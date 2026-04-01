import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Family } from '../entities/family.entity';
import { FamilyMember } from '../entities/family-member.entity';
import { FamilyRole } from '../../common/enums';
import { FamilyPolicy } from '../policies/family.policy';

@Injectable()
export class AddFamilyMemberUseCase {
  constructor(
    private readonly dataSource: DataSource,
    private readonly policy: FamilyPolicy,
  ) { }

  async execute(
    familyId: string,
    memberId: string,
    role: string,
    churchId: string,
  ): Promise<FamilyMember> {
    return this.dataSource.transaction(async (manager) => {
      const familyRepo = manager.getRepository(Family);
      const familyMemberRepo = manager.getRepository(FamilyMember);

      // 1. Get Family
      // We need members to check duplicates if not trusting DB constraint solely,
      // but policy method 'ensureCanAddMember' expects family with members.
      const family = await familyRepo.findOne({
        where: { id: familyId, churchId },
        relations: ['members', 'members.member'],
      });

      if (!family) {
        throw new NotFoundException('Family not found');
      }

      // 2. Validate
      this.policy.ensureCanAddMember(family, memberId);
      this.policy.ensureValidRole(role);

      // 3. Create Membership
      // Check if exists (Redundant check if policy did it, but good for concurrency or soft deleted?)
      // Policy checked in-memory list. Unique index is the final guard.

      const familyMember = familyMemberRepo.create({
        familyId: familyId,
        memberId: memberId,
        role: role as FamilyRole,
      });

      return familyMemberRepo.save(familyMember);
    });
  }
}
