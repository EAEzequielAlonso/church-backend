import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmallGroup } from '../entities/small-group.entity';
import { SmallGroupMember } from '../entities/small-group-member.entity';
import { SmallGroupPolicy } from '../policies/small-group.policy';

@Injectable()
export class RemoveMemberUseCase {
    constructor(
        @InjectRepository(SmallGroup)
        private readonly groupRepository: Repository<SmallGroup>,
        @InjectRepository(SmallGroupMember)
        private readonly memberRepository: Repository<SmallGroupMember>,
        private readonly policy: SmallGroupPolicy
    ) { }

    async execute(groupId: string, memberId: string, user: any): Promise<void> {
        const group = await this.groupRepository.findOne({
            where: { id: groupId },
            relations: ['members', 'members.member']
        });
        if (!group) throw new NotFoundException('Small Group not found');

        // Policy Check: Can this user manage members?
        // If user is removing themselves (Leave), it's different.
        if (user.memberId !== memberId) {
            this.policy.ensureUserIsGroupLeader(user, group);
        }
        this.policy.ensureGroupIsNotFinished(group);

        const member = await this.memberRepository.findOne({
            where: [
                { group: { id: groupId }, member: { id: memberId } }, // Treated as ChurchMember ID (Leave)
                { group: { id: groupId }, id: memberId } // Treated as SmallGroupMember ID (Remove from List)
            ],
            relations: ['member', 'group'] // Ensure relations for role check
        });

        if (!member) throw new NotFoundException('Miembro no encontrado en este grupo');

        if (member.role === 'MODERATOR') {
            throw new BadRequestException('El encargado no puede salir del grupo. Primero asigne un nuevo encargado.');
        }

        await this.memberRepository.remove(member);
    }
}
