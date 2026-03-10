import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MinistryMember } from '../entities/ministry-member.entity';
import { MinistryPolicy } from '../policies/ministry.policy';
import { SystemRole, FunctionalRole } from '../../common/enums';

@Injectable()
export class DeleteMinistryMemberUseCase {
    constructor(
        @InjectRepository(MinistryMember)
        private readonly memberRepo: Repository<MinistryMember>,
        private readonly ministryPolicy: MinistryPolicy,
    ) { }

    async execute(
        ministryId: string,
        memberId: string, // This is the UUID of the person in the ChurchPerson repo usually, see how it was handled
        churchId: string,
        requestPersonId: string,
        systemRole: SystemRole,
        functionalRole: FunctionalRole
    ): Promise<MinistryMember> {

        await this.ministryPolicy.assertIsLeader(ministryId, requestPersonId, churchId, systemRole, functionalRole);

        const member = await this.memberRepo.findOne({
            where: { ministryId, memberId },
        });

        if (!member) throw new NotFoundException('Miembro no encontrado en este ministerio');

        member.status = 'inactive';
        return this.memberRepo.save(member);
    }
}
