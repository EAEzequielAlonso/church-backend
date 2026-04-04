import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
            where: { id: memberMinistryId, ministryId },
            relations: ['member', 'member.person'],
        });

        if (!membership) {
            throw new NotFoundException('Miembro no encontrado en este ministerio');
        }

        if (membership.roleInMinistry === MinistryRole.LEADER) {
            throw new BadRequestException('No puedes cambiar el rol del líder del ministerio desde aquí. Debes designar un nuevo líder desde la configuración del ministerio.');
        }

        membership.roleInMinistry = newRole;
        return this.memberRepo.save(membership);
    }
}
