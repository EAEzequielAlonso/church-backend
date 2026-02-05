import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmallGroup } from '../entities/small-group.entity';
import { SmallGroupMember } from '../entities/small-group-member.entity';
import { ChurchMember } from '../../members/entities/church-member.entity';
import { SmallGroupRole, SmallGroupStatus } from '../../common/enums';

import { SmallGroupPolicy } from '../policies/small-group.policy';

@Injectable()
export class EnrollMemberUseCase {
    constructor(
        private readonly dataSource: DataSource,
        @InjectRepository(SmallGroup)
        private readonly groupRepository: Repository<SmallGroup>,
        @InjectRepository(ChurchMember)
        private readonly memberRepository: Repository<ChurchMember>,
        private readonly policy: SmallGroupPolicy
    ) { }

    async execute(groupId: string, memberId: string, user: any, isPrivileged: boolean = false, role: SmallGroupRole = SmallGroupRole.PARTICIPANT): Promise<SmallGroupMember> {
        return this.dataSource.transaction(async (manager) => {
            // 1. Fetch Group with locking or just simple fetch
            const group = await manager.findOne(SmallGroup, {
                where: { id: groupId },
                relations: ['members', 'members.member'] // Needed for Policy checks
            });

            if (!group) throw new NotFoundException('Small Group not found');

            // 2. Policy/Domain Checks
            // If adding someone else, validate ownership, UNLESS privileged
            if (user.memberId !== memberId && !isPrivileged) {
                this.policy.ensureUserIsGroupLeader(user, group);
            }

            this.policy.ensureGroupIsNotFinished(group);

            // Optional: If enrolling as participant, check openEnrollment? 
            // The requirement says "no romper contratos", so assuming current flow allows it manually via leader.
            // If self-enrollment (join), we might check openEnrollment, but this UseCase is generic.

            // 3. Check if Member exists
            const member = await manager.findOne(ChurchMember, { where: { id: memberId } });
            if (!member) throw new NotFoundException('Church Member not found');

            // 4. Check Duplicate (Unique constraint handles it, but nice error is better)
            const existing = await manager.findOne(SmallGroupMember, {
                where: {
                    group: { id: groupId },
                    member: { id: memberId }
                }
            });

            if (existing) {
                // Idempotent or Error? Existing code returned it.
                // Let's return existing to maintain contract, or check if role update is needed.
                if (existing.role !== role) {
                    existing.role = role;
                    return manager.save(existing);
                }
                return existing;
            }

            // 5. Create Membership
            const newMember = manager.create(SmallGroupMember, {
                group: group,
                member: member,
                role: role
            });

            return manager.save(newMember);
        });
    }
}
