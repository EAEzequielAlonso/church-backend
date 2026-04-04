import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ministry } from '../entities/ministry.entity';
import { MinistryMember } from '../entities/ministry-member.entity';
import { ChurchPerson } from '../../members/entities/church-person.entity';
import { MinistryRole, SystemRole, FunctionalRole } from '../../common/enums';
import { MinistryPolicy } from '../policies/ministry.policy';

@Injectable()
export class AddMinistryMemberUseCase {
    constructor(
        @InjectRepository(Ministry)
        private readonly ministryRepo: Repository<Ministry>,
        @InjectRepository(MinistryMember)
        private readonly memberRepo: Repository<MinistryMember>,
        @InjectRepository(ChurchPerson)
        private readonly churchPersonRepo: Repository<ChurchPerson>,
        private readonly ministryPolicy: MinistryPolicy,
    ) { }

    async execute(
        ministryId: string,
        memberId: string,
        role: MinistryRole,
        churchId: string,
        requestPersonId: string,
        systemRole: SystemRole,
        functionalRole: FunctionalRole
    ): Promise<MinistryMember> {

        await this.ministryPolicy.assertIsLeader(ministryId, requestPersonId, churchId, systemRole, functionalRole);

        // Prevent duplicates efficiently
        const isMember = await this.memberRepo.count({
            where: { ministryId, memberId}
        });

        if (isMember > 0) {
            throw new ConflictException('La persona ya es integrante de este ministerio.');
        }

        const person = await this.churchPersonRepo.count({
            where: { id: memberId },
        });

        if (person === 0) throw new NotFoundException('Persona no encontrada');

        const membership = this.memberRepo.create({
            ministryId,
            memberId,
            roleInMinistry: role,
            joinedAt: new Date(),
        });

        return this.memberRepo.save(membership);
    }
}
