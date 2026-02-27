import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FollowUp } from '../entities/follow-up.entity';
import { FollowupPolicy } from '../policies/followup.policy';
import { FollowUpStatus } from '../../common/enums';

@Injectable()
export class ChangeFollowupStatusUseCase {
    constructor(
        @InjectRepository(FollowUp)
        private readonly followupRepo: Repository<FollowUp>,
        private readonly policy: FollowupPolicy,
    ) { }

    async execute(
        churchId: string,
        followupId: string,
        status: FollowUpStatus,
        user: any
    ): Promise<FollowUp> {
        if (!this.policy.canChangeStatus(user)) {
            throw new ForbiddenException('You do not have permission to change follow-up status');
        }

        const followup = await this.followupRepo.findOne({ where: { id: followupId, churchId } });
        if (!followup) {
            throw new NotFoundException('Follow-up not found');
        }

        followup.status = status;

        if (status === FollowUpStatus.ARCHIVED) {
            followup.archivedAt = new Date();
        } else {
            followup.archivedAt = null; // Unarchive if moving back
        }

        return this.followupRepo.save(followup);
    }
}
