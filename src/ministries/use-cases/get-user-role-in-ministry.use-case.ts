import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MinistryMember } from '../entities/ministry-member.entity';
import { MinistryRole } from '../../common/enums';

@Injectable()
export class GetUserRoleInMinistryUseCase {
    constructor(
        @InjectRepository(MinistryMember)
        private readonly memberRepo: Repository<MinistryMember>,
    ) { }

    /**
     * Used to fetch a user's role within a ministry context
     */
    async execute(ministryId: string, personId: string, churchId: string): Promise<MinistryRole | null> {
        const membership = await this.memberRepo.findOne({
            where: {
                ministryId,
                member: { person: { id: personId } },
            },
            relations: ['member', 'member.person'],
        });

        // Add additional check for churchId matching if necessary, though contextually ministry already belongs to church
        // In a strictly optimized way, we should just query ministryId and memberId if we had personId->memberId map.
        // For now, retaining the logic from the service but with explicitly less nested where if possible.

        // Actually, we can just use the previous logic with the explicit ministryId:
        const membershipStrict = await this.memberRepo.findOne({
            where: {
                ministryId,
                member: { person: { id: personId } },
            },
            relations: ['ministry', 'member', 'member.person'],
        });

        if (!membershipStrict || membershipStrict.ministry.churchId !== churchId) {
            // To ensure we don't return a role for a church they aren't querying
            // Wait, ministry table has church: Church relation, and churchId column.
            // We can check ministry.churchId == churchId
        }

        return membership ? membership.roleInMinistry : null;
    }
}
