import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Family } from '../entities/family.entity';
import { FamilyMember } from '../entities/family-member.entity';
import { CreateFamilyDto } from '../dto/create-family.dto';
import { MembersService } from '../../members/members.service';
import { FamilyPolicy } from '../policies/family.policy';
import { FamilyRole } from '../../common/enums';
import { MembershipStatus } from '../../members/enums/membership-status.enum';

@Injectable()
export class CreateFamilyUseCase {
  constructor(
    private readonly dataSource: DataSource,
    private readonly membersService: MembersService,
    private readonly policy: FamilyPolicy,
  ) { }

  async execute(createDto: CreateFamilyDto, churchId: string): Promise<Family> {
    return this.dataSource.transaction(async (manager) => {
      const familyRepo = manager.getRepository(Family);
      const familyMemberRepo = manager.getRepository(FamilyMember);

      // 1. Create Family Entity
      const family = familyRepo.create({
        name: createDto.name,
        church: { id: churchId },
      });

      this.policy.ensureValidFamilyState(family);

      const savedFamily = await familyRepo.save(family);

      // 2. Process Members
      // Deduplicate members by memberId to prevent duplicate key violations
      const processedMemberIds = new Set<string>();
      const uniqueMembers = createDto.members.filter((m) => {
        if (m.memberId) {
          if (processedMemberIds.has(m.memberId)) return false;
          processedMemberIds.add(m.memberId);
        }
        return true;
      });

      for (const memberDto of uniqueMembers) {
        let memberId = memberDto.memberId;

        // Creating new member if needed (e.g. Children)
        if (!memberId && memberDto.newMember) {
          if (
            memberDto.role === FamilyRole.CHILD &&
            !memberDto.newMember.status
          ) {
            memberDto.newMember.status = MembershipStatus.CHILD;
          }

          // Use MembersService interacting with the transactional manager if possible.
          // Since MembersService.create DOES NOT accept a manager in its current signature (based on analysis),
          // we call it standardly. If it fails, the transaction rolls back the family.
          // NOTE: Ideally MembersService should be refactored to accept a manager,
          // but per instructions we only refactor Families.
          // Workaround: We proceed; if this fails, transaction rolls back.
          // The member created by this service call would persist if the transaction rolls back?
          // Yes, because MembersService.create creates its own transaction or saves directly.
          // However, we are strictly instructed to use transactions.
          // We will pass the manager if we can modify MembersService, BUT "NO cambiar contratos DTO externos, salvo que sea absolutamente necesario."
          // Let's pass the manager as a 3rd optional arg to MembersService if it supported it.
          // Looking at `families.service.ts` original code:
          // `const newMember = await this.membersService.create(memberDto.newMember, churchId, queryRunner.manager);`
          // Ah! The original code DID pass queryRunner.manager!
          // This implies MembersService.create ALREADY accepts it (or was hacked to).
          // I will replicate that pattern.
          const newMember = await this.membersService.create(
            memberDto.newMember,
            churchId,
            manager,
          );
          memberId = newMember.id;
        }

        if (!memberId) continue;

        const familyMember = familyMemberRepo.create({
          family: savedFamily,
          member: { id: memberId },
          role: memberDto.role as FamilyRole,
        });

        await familyMemberRepo.save(familyMember);
      }

      return savedFamily;
    });
  }
}
