import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { MentorshipService } from '../services/mentorship.service';
import { MentorshipPolicy } from '../policies/mentorship.policy';
import { MentorshipProcess } from '../entities/mentorship-process.entity';
import { MentorshipNote } from '../entities/mentorship-note.entity';
import { AddNoteDto } from '../dto/mentorship-content.dto';
import { MentorshipVisibilityPolicy, VisibilityUserContext } from '../policies/mentorship.visibility-policy';

@Injectable()
export class AddNoteUseCase {
  constructor(
    private readonly mentorshipService: MentorshipService,
    private readonly mentorshipPolicy: MentorshipPolicy,
    private readonly visibilityPolicy: MentorshipVisibilityPolicy,
  ) {}

  async execute(
    dto: AddNoteDto,
    executor: VisibilityUserContext,
  ): Promise<MentorshipProcess> {
    const process = await this.mentorshipService.findById(dto.processId, executor.churchId);

    if (!process) {
      throw new NotFoundException(`El proceso de mentoría con ID ${dto.processId} no existe.`);
    }

    this.mentorshipPolicy.assertActive(process.status);
    
    if (!this.visibilityPolicy.canAddNote(executor, process)) {
      throw new ForbiddenException('No tienes permisos para añadir notas a este proceso.');
    }
    this.mentorshipPolicy.validateNoteAddition(process.mode, dto.type);

    const authorId = dto.authorChurchPersonId || executor.userId;
    if (!authorId) {
      throw new Error('No se pudo determinar el autor de la nota (authorChurchPersonId missing).');
    }

    const note = new MentorshipNote();
    note.authorChurchPersonId = authorId;
    note.meetingId = dto.meetingId;
    note.title = dto.title;
    note.type = dto.type;
    note.content = dto.content;

    if (!process.notes) {
      process.notes = [];
    }
    process.notes.push(note);

    const savedProcess = await this.mentorshipService.save(process);

    return savedProcess;
  }
}
