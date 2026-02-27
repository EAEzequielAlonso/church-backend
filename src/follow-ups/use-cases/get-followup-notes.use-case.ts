import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FollowUpNote } from '../entities/follow-up-note.entity';
import { FollowUp } from '../entities/follow-up.entity';
import { FollowupPolicy } from '../policies/followup.policy';
import { FollowUpNoteType } from '../enums/follow-up-note-type.enum';

@Injectable()
export class GetFollowupNotesUseCase {
    constructor(
        @InjectRepository(FollowUpNote)
        private readonly noteRepo: Repository<FollowUpNote>,
        @InjectRepository(FollowUp)
        private readonly followupRepo: Repository<FollowUp>,
        private readonly policy: FollowupPolicy,
    ) { }

    async execute(churchId: string, followupId: string, user: any): Promise<FollowUpNote[]> {
        const followup = await this.followupRepo.findOne({ where: { id: followupId, churchId } });

        if (!followup) {
            throw new NotFoundException('Follow-up not found');
        }

        if (!this.policy.canView(user, followup)) {
            throw new ForbiddenException('You do not have permission to view notes for this follow-up');
        }

        const query = this.noteRepo.createQueryBuilder('note')
            .leftJoinAndSelect('note.author', 'author')
            .where('note.followupId = :followupId', { followupId })
            .andWhere('note.churchId = :churchId', { churchId });

        // Logic for Filtered Notes:
        // SHARED: Everyone can see
        // PASTORAL: Managers (Admin/Auditor) can see
        // INTERNAL: Managers + Assigned Member + Author can see

        const isManager = this.policy.canManageAll(user);
        const isAssigned = followup.assignedToId && user.memberId === followup.assignedToId;
        const memberId = user.memberId;

        if (isManager) {
            // Managers see EVERYTHING (Shared, Pastoral, Internal)
            // No filter needed on type, just return all notes for this followup
        } else if (isAssigned) {
            // Assigned Member sees: SHARED, INTERNAL. Cannot see PASTORAL.
            query.andWhere('note.type IN (:...types)', { types: [FollowUpNoteType.SHARED, FollowUpNoteType.INTERNAL] });
        } else {
            // Regular user (unassigned)? 
            // If they can view (e.g. they created it but are not assigned?), they see SHARED + INTERNAL (if they authored it?)
            // Policy said: Internal visible to Author.
            // Complex query: (type = SHARED) OR (type = INTERNAL AND createdByMemberId = :memberId)

            // However, typical flow: member creating note on unassigned? 
            // Let's stick to simple: Unassigned only sees SHARED + Own Internal.
            query.andWhere(
                '(note.type = :sharedType OR (note.type = :internalType AND note.createdByMemberId = :memberId))',
                { sharedType: FollowUpNoteType.SHARED, internalType: FollowUpNoteType.INTERNAL, memberId }
            );
        }

        query.orderBy('note.createdAt', 'DESC');

        return query.getMany();
    }
}
