import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Family } from '../entities/family.entity';
import { FamilyMember } from '../entities/family-member.entity';

@Injectable()
export class GetFamilyUseCase {
    constructor(
        @InjectRepository(Family)
        private readonly familyRepository: Repository<Family>,
        @InjectRepository(FamilyMember)
        private readonly familyMemberRepository: Repository<FamilyMember>
    ) { }

    async byId(id: string): Promise<Family> {
        const family = await this.familyRepository.createQueryBuilder('family')
            .leftJoinAndSelect('family.members', 'members')
            .leftJoinAndSelect('members.member', 'member')
            .leftJoinAndSelect('member.person', 'person')
            .where('family.id = :id', { id })
            .getOne();

        if (!family) {
            throw new NotFoundException('Family not found');
        }
        return family;
    }

    async byMember(memberId: string): Promise<Family | null> {
        // We need to find the family this member belongs to.
        // Optimized query starting from FamilyMember
        const membership = await this.familyMemberRepository.createQueryBuilder('fm')
            .leftJoinAndSelect('fm.family', 'family')
            .where('fm.member.id = :memberId', { memberId })
            .getOne();

        if (!membership) return null;

        // Now get full family details
        return this.byId(membership.family.id);
    }
}
