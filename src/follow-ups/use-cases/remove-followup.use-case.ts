import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FollowUp } from '../entities/follow-up.entity';
import { FollowupPolicy } from '../policies/followup.policy';

@Injectable()
export class RemoveFollowupUseCase {
    constructor(
        @InjectRepository(FollowUp)
        private readonly followupRepo: Repository<FollowUp>,
        private readonly policy: FollowupPolicy,
    ) { }

    async execute(churchId: string, id: string, user: any): Promise<void> {
        if (!this.policy.canManageAll(user)) {
            throw new ForbiddenException('You do not have permission to delete follow-ups');
        }

        const followup = await this.followupRepo.findOne({ where: { id, churchId } });
        if (!followup) {
            throw new NotFoundException('Follow-up not found');
        }

        await this.followupRepo.remove(followup);
    }
}
