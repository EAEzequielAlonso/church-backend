import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FollowUpNote } from '../entities/follow-up-note.entity';
import { FollowupPolicy } from '../policies/followup.policy';

@Injectable()
export class DeleteFollowupNoteUseCase {
    constructor(
        @InjectRepository(FollowUpNote)
        private readonly noteRepo: Repository<FollowUpNote>,
        private readonly policy: FollowupPolicy,
    ) { }

    async execute(churchId: string, noteId: string, user: any) {
        const note = await this.noteRepo.findOne({
            where: { id: noteId, churchId },
        });

        if (!note) {
            throw new NotFoundException('Nota no encontrada');
        }

        if (!this.policy.canDeleteNote(user, note)) {
            throw new ForbiddenException('No tienes permiso para eliminar esta nota');
        }

        // Hard delete as per user request
        await this.noteRepo.delete(note.id);
        return { success: true };
    }
}
