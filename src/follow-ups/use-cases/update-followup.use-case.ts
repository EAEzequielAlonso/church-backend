import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FollowUp } from '../entities/follow-up.entity';
import { FollowupPolicy } from '../policies/followup.policy';

@Injectable()
export class UpdateFollowupUseCase {
    constructor(
        @InjectRepository(FollowUp)
        private readonly followupRepo: Repository<FollowUp>,
        private readonly policy: FollowupPolicy,
    ) { }

    async execute(
        churchId: string,
        followupId: string,
        data: Partial<FollowUp>,
        user: any
    ): Promise<FollowUp> {
        if (!this.policy.canManageAll(user)) {
            throw new ForbiddenException('You do not have permission to update follow-ups');
        }

        const followup = await this.followupRepo.findOne({ where: { id: followupId, churchId } });
        if (!followup) {
            throw new NotFoundException('Follow-up not found');
        }

        Object.assign(followup, data);
        return this.followupRepo.save(followup);
    }
}
