import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { FollowUpNote } from '../entities/follow-up-note.entity';
import { FollowUp } from '../entities/follow-up.entity';
import { FollowupPolicy } from '../policies/followup.policy';
import { FollowUpNoteType } from '../enums/follow-up-note-type.enum';

@Injectable()
export class CreateFollowupNoteUseCase {
    constructor(
        @InjectRepository(FollowUpNote)
        private readonly noteRepo: Repository<FollowUpNote>,
        @InjectRepository(FollowUp)
        private readonly followupRepo: Repository<FollowUp>,
        private readonly policy: FollowupPolicy,
        private readonly dataSource: DataSource,
    ) { }

    async execute(
        churchId: string,
        followupId: string,
        authorPersonId: string,
        user: any,
        data: { text: string; type: FollowUpNoteType }
    ): Promise<FollowUpNote> {
        const followup = await this.followupRepo.findOne({ where: { id: followupId, churchId } });

        if (!followup) {
            throw new NotFoundException('Follow-up not found');
        }

        if (!this.policy.canCreateNote(user, followup)) {
            throw new ForbiddenException('You do not have permission to add notes to this follow-up');
        }

        return this.dataSource.transaction(async (manager) => {
            const note = manager.create(FollowUpNote, {
                churchId,
                followupId,
                authorPersonId,
                text: data.text,
                type: data.type,
            });

            await manager.save(note);

            // Touch update time
            // We can use the manager to update the followup timestamp if desired, 
            // but strictly calling create/save on the note is enough for the note itself.
            // If we want to verify 'updatedAt' on followup changes when a note is added:
            // await manager.update(FollowUp, { id: followupId }, { updatedAt: new Date() }); 
            // This is good practice for "activity".

            return note;
        });
    }
}
