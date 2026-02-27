import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FollowUpNote } from '../entities/follow-up-note.entity';
import { FollowupPolicy } from '../policies/followup.policy';
import { FollowUpNoteType } from '../enums/follow-up-note-type.enum';

@Injectable()
export class UpdateFollowupNoteUseCase {
    constructor(
        @InjectRepository(FollowUpNote)
        private readonly noteRepo: Repository<FollowUpNote>,
        private readonly policy: FollowupPolicy,
    ) { }

    async execute(churchId: string, noteId: string, data: { text?: string; type?: FollowUpNoteType }, user: any) {
        const note = await this.noteRepo.findOne({
            where: { id: noteId, churchId },
        });

        if (!note) {
            throw new NotFoundException('Nota no encontrada');
        }

        if (!this.policy.canEditNote(user, note)) {
            throw new ForbiddenException('No tienes permiso para editar esta nota');
        }

        if (data.text) note.text = data.text;
        if (data.type) note.type = data.type;

        return this.noteRepo.save(note);
    }
}
