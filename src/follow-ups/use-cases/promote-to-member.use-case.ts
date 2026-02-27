import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FollowUp } from '../entities/follow-up.entity';
import { FollowupPolicy } from '../policies/followup.policy';
import { MembersService } from '../../members/members.service';
import { FollowUpStatus } from '../../common/enums';
import { MembershipStatus } from '../../members/enums/membership-status.enum';

@Injectable()
export class PromoteToMemberUseCase {
    constructor(
        @InjectRepository(FollowUp)
        private readonly followupRepo: Repository<FollowUp>,
        private readonly policy: FollowupPolicy,
        private readonly membersService: MembersService,
    ) { }

    async execute(churchId: string, id: string, user: any): Promise<any> {
        if (!this.policy.canManageAll(user)) {
            throw new ForbiddenException('You do not have permission to promote visitors');
        }

        // Fetch with needed relations
        const visitor = await this.followupRepo.findOne({
            where: { id, churchId },
            relations: ['church', 'churchPerson']
        });

        if (!visitor) {
            throw new NotFoundException('Visitor not found');
        }

        if (visitor.churchPerson.membershipStatus === MembershipStatus.MEMBER) {
            throw new ConflictException('This visitor has already been promoted to member');
        }

        // Update Member status via MembersService
        await this.membersService.update(visitor.churchPerson.id, { status: MembershipStatus.MEMBER }, churchId);

        // Link & Archive Visitor
        visitor.status = FollowUpStatus.ARCHIVED;
        visitor.archivedAt = new Date();

        await this.followupRepo.save(visitor);

        return visitor.churchPerson;
    }
}
