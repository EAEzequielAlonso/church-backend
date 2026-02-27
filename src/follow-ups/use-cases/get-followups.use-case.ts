import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FollowUp } from '../entities/follow-up.entity';
import { FollowupPolicy } from '../policies/followup.policy';
import { FollowUpStatus } from '../../common/enums';

@Injectable()
export class GetFollowupsUseCase {
    constructor(
        @InjectRepository(FollowUp)
        private readonly followupRepo: Repository<FollowUp>,
        private readonly policy: FollowupPolicy,
    ) { }

    async execute(
        churchId: string,
        user: any,
        filters: { status?: FollowUpStatus | string; search?: string; assignedToMe?: boolean; page?: number; limit?: number }
    ): Promise<{ data: FollowUp[], meta: { total: number; page: number; limit: number; totalPages: number } }> {
        const canViewAll = this.policy.canViewAll(user);

        // If user cannot view all, enforce assignedToMe = true implicitly
        if (!canViewAll) {
            filters.assignedToMe = true;
        }

        const page = filters.page ? Number(filters.page) : 1;
        const limit = filters.limit ? Number(filters.limit) : 10;
        const skip = (page - 1) * limit;

        const query = this.followupRepo.createQueryBuilder('followup')
            .leftJoinAndSelect('followup.assignedMember', 'assignedMember')
            .leftJoinAndSelect('assignedMember.person', 'assignedPerson')
            .leftJoinAndSelect('followup.createdByMember', 'createdByMember')
            .leftJoinAndSelect('createdByMember.person', 'creatorPerson')
            .where('followup.churchId = :churchId', { churchId });

        // Status Filter
        if (filters.status) {
            const statusStr = filters.status.toString();
            if (statusStr.includes(',')) {
                // Handle multiple statuses
                const statuses = statusStr.split(',').map(s => s.trim());
                if (statuses.length > 0) {
                    query.andWhere('followup.status IN (:...statuses)', { statuses });
                }
            } else {
                query.andWhere('followup.status = :status', { status: statusStr });
            }
        }

        // Search Filter
        if (filters.search) {
            query.andWhere(
                "(followup.firstName ILIKE :search OR followup.lastName ILIKE :search OR followup.email ILIKE :search)",
                { search: `%${filters.search}%` }
            );
        }

        // Assigned To Me Filter
        if (filters.assignedToMe) {
            if (user.memberId) {
                query.andWhere('followup.assignedMemberId = :memberId', { memberId: user.memberId });
            }
        }

        query.orderBy('followup.createdAt', 'DESC');

        // Pagination
        query.skip(skip).take(limit);

        const [data, total] = await query.getManyAndCount();

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
}
