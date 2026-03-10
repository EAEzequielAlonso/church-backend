import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MinistryMember } from '../entities/ministry-member.entity';
import { MinistryPolicy } from '../policies/ministry.policy';
import { SystemRole, FunctionalRole, MinistryRole } from '../../common/enums';

@Injectable()
export class UpdateMinistryMemberRoleUseCase {
    constructor(
        @InjectRepository(MinistryMember)
        private readonly memberRepo: Repository<MinistryMember>,
        private readonly ministryPolicy: MinistryPolicy,
    ) { }

    async execute(
        ministryId: string,
        memberMinistryId: string,
        newRole: MinistryRole,
        churchId: string,
        requestPersonId: string,
        systemRole: SystemRole,
        functionalRole: FunctionalRole
    ): Promise<MinistryMember> {

        await this.ministryPolicy.assertIsLeader(ministryId, requestPersonId, churchId, systemRole, functionalRole);

        const membership = await this.memberRepo.findOne({
            where: { memberId: memberMinistryId, ministryId },
            relations: ['member', 'member.person'],
        });

        if (!membership) {
            throw new NotFoundException('Miembro no encontrado en este ministerio');
        }

        membership.roleInMinistry = newRole;
        return this.memberRepo.save(membership);
    }
}
