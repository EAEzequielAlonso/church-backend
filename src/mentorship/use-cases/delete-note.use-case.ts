import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MentorshipNote } from '../entities/mentorship-note.entity';
import { MentorshipPolicy } from '../policies/mentorship.policy';

import { MentorshipVisibilityPolicy, VisibilityUserContext } from '../policies/mentorship.visibility-policy';

@Injectable()
export class DeleteNoteUseCase {
  constructor(
    @InjectRepository(MentorshipNote)
    private readonly noteRepository: Repository<MentorshipNote>,
    private readonly mentorshipPolicy: MentorshipPolicy,
    private readonly visibilityPolicy: MentorshipVisibilityPolicy,
  ) {}

  async execute(
    noteId: string,
    executor: VisibilityUserContext,
  ) {
    const note = await this.noteRepository.findOne({
      where: { id: noteId },
      relations: { process: { participants: true } },
    });

    if (!note) {
      throw new NotFoundException(`La nota con ID ${noteId} no existe.`);
    }

    const process = note.process;
    this.mentorshipPolicy.assertActive(process.status);

    if (!this.visibilityPolicy.canDeleteNote(executor, note)) {
      throw new ForbiddenException('No tienes permisos para eliminar esta nota.');
    }

    await this.noteRepository.remove(note);
  }
}
