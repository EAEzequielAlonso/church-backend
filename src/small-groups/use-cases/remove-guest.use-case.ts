import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmallGroup } from '../entities/small-group.entity';
import { SmallGroupGuest } from '../entities/small-group-guest.entity';
import { SmallGroupPolicy } from '../policies/small-group.policy';

@Injectable()
export class RemoveGuestUseCase {
    constructor(
        @InjectRepository(SmallGroup)
        private readonly groupRepository: Repository<SmallGroup>,
        @InjectRepository(SmallGroupGuest)
        private readonly guestRepository: Repository<SmallGroupGuest>,
        private readonly policy: SmallGroupPolicy
    ) { }

    async execute(groupId: string, guestId: string, user: any, isPrivileged: boolean = false): Promise<void> {
        const group = await this.groupRepository.findOne({
            where: { id: groupId },
            relations: ['members', 'members.member']
        });
        if (!group) throw new NotFoundException('Small Group not found');

        if (!isPrivileged) {
            this.policy.ensureUserIsGroupLeader(user, group);
        }
        this.policy.ensureGroupIsNotFinished(group);

        const guest = await this.guestRepository.findOne({
            where: { id: guestId, group: { id: groupId } }
        });

        if (!guest) throw new NotFoundException('Guest not found');

        await this.guestRepository.remove(guest);
    }
}
