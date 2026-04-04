import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MinistryMember } from '../entities/ministry-member.entity';
import { MinistryPolicy } from '../policies/ministry.policy';
import { SystemRole, FunctionalRole, MinistryRole } from '../../common/enums';

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
            where: { id: memberId, ministryId },
        });

        if (!member) throw new NotFoundException('Miembro no encontrado en este ministerio');

        if (member.roleInMinistry === MinistryRole.LEADER) {
            throw new BadRequestException('No puedes eliminar al líder del ministerio. Primero designa a un nuevo responsable desde la configuración general.');
        }

        return this.memberRepo.remove(member);
    }
}
