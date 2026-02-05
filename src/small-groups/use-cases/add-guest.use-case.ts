import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmallGroup } from '../entities/small-group.entity';
import { SmallGroupGuest } from '../entities/small-group-guest.entity';
import { FollowUpPerson } from '../../follow-ups/entities/follow-up-person.entity';
import { PersonInvited } from '../../courses/entities/person-invited.entity';

import { SmallGroupPolicy } from '../policies/small-group.policy';

@Injectable()
export class AddGuestUseCase {
    constructor(
        @InjectRepository(SmallGroup)
        private readonly groupRepository: Repository<SmallGroup>,
        @InjectRepository(SmallGroupGuest)
        private readonly guestRepository: Repository<SmallGroupGuest>,
        private readonly policy: SmallGroupPolicy
    ) { }

    async execute(groupId: string, guestDto: {
        fullName?: string,
        email?: string,
        followUpPersonId?: string,
        personInvitedId?: string
    }, user: any, isPrivileged: boolean = false): Promise<SmallGroupGuest> {
        const group = await this.groupRepository.findOne({
            where: { id: groupId },
            relations: ['members', 'members.member']
        });
        if (!group) throw new NotFoundException(`Small Group with ID ${groupId} not found`);

        if (!isPrivileged) {
            this.policy.ensureUserIsGroupLeader(user, group);
        }
        this.policy.ensureGroupIsNotFinished(group);

        const { fullName, email, followUpPersonId, personInvitedId } = guestDto;

        // Duplicate Check
        if (followUpPersonId || personInvitedId) {
            const whereConditions = [];
            if (followUpPersonId) whereConditions.push({ group: { id: groupId }, followUpPerson: { id: followUpPersonId } });
            if (personInvitedId) whereConditions.push({ group: { id: groupId }, personInvited: { id: personInvitedId } });

            const existing = await this.guestRepository.findOne({
                where: whereConditions
            });

            if (existing) {
                throw new BadRequestException('Esta persona ya está en la lista de invitados del grupo.');
            }
        }

        const guest = this.guestRepository.create({
            group,
            fullName: fullName || 'Invitado sin nombre',
            email,
            followUpPerson: followUpPersonId ? { id: followUpPersonId } as FollowUpPerson : null,
            personInvited: personInvitedId ? { id: personInvitedId } as PersonInvited : null
        });

        return this.guestRepository.save(guest);
    }
}
