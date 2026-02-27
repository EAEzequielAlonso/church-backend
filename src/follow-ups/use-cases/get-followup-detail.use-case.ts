import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FollowUp } from '../entities/follow-up.entity';
import { FollowupPolicy } from '../policies/followup.policy';

@Injectable()
export class GetFollowupDetailUseCase {
    constructor(
        @InjectRepository(FollowUp)
        private readonly followupRepo: Repository<FollowUp>,
        private readonly policy: FollowupPolicy,
    ) { }

    async execute(churchId: string, id: string, user: any): Promise<FollowUp> {
        const followup = await this.followupRepo.findOne({
            where: { id, churchId },
            relations: ['assignedMember', 'assignedMember.person', 'createdByMember', 'createdByMember.person', 'notes', 'notes.author']
        });

        if (!followup) {
            throw new NotFoundException('Follow-up not found');
        }

        if (!this.policy.canView(user, followup)) {
            throw new ForbiddenException('You do not have permission to view this follow-up');
        }

        return followup;
    }
}
