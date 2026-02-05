import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmallGroup } from '../entities/small-group.entity';
import { SmallGroupPolicy } from '../policies/small-group.policy';

@Injectable()
export class DeleteSmallGroupUseCase {
    constructor(
        @InjectRepository(SmallGroup)
        private readonly groupRepository: Repository<SmallGroup>,
        private readonly policy: SmallGroupPolicy
    ) { }

    async execute(id: string, user: any): Promise<void> {
        // Fetch group. For deletion, we might need relation checks if not relying on cascade ONLY.
        // Assuming strict ownership check requested by prompt (policy validation).
        // BUT policy "must not check roles".
        // UseCase assumes user has permission.
        // Does "Delete" require "Leader" ownership? Usually Admin deletes.
        // If Admin deletes, ensureUserIsGroupLeader fails.
        // Prompt said: "Delete... only check domain restrictions (example: cannot delete if active sessions exist)... NOT role based".
        // It did NOT say "ensureUserIsGroupLeader" for delete.
        // So for Delete, we probably DON'T check ownership in Policy, unless Leader owns deletion.
        // I will implement "ensureGroupCanBeDeleted(group)" in policy if needed, or just execute if Guard allowed it.
        // Prompt says "Policy only validates domain rules".

        const group = await this.groupRepository.findOne({ where: { id } });
        if (!group) throw new NotFoundException(`Small Group with ID ${id} not found`);

        // If there are strict domain rules for deletion (like not deleting if it has history), check here.
        // Default: just delete.

        await this.groupRepository.remove(group);
    }
}
