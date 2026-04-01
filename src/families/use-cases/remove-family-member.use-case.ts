import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FamilyMember } from '../entities/family-member.entity';

@Injectable()
export class RemoveFamilyMemberUseCase {
  constructor(private readonly dataSource: DataSource) { }

  async execute(familyId: string, memberId: string, churchId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const familyMemberRepo = manager.getRepository(FamilyMember);

      const fm = await familyMemberRepo.findOne({
        where: { family: { id: familyId, churchId }, memberId },
      });

      if (!fm) {
        throw new NotFoundException('Member not found in family');
      }

      await familyMemberRepo.remove(fm);
    });
  }
}
