import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MentorshipNote } from '../entities/mentorship-note.entity';
import { UpdateNoteDto } from '../dto/mentorship-content.dto';
import { MentorshipPolicy } from '../policies/mentorship.policy';
import { MentorshipService } from '../services/mentorship.service';

import { MentorshipVisibilityPolicy, VisibilityUserContext } from '../policies/mentorship.visibility-policy';

@Injectable()
export class UpdateNoteUseCase {
  constructor(
    @InjectRepository(MentorshipNote)
    private readonly noteRepository: Repository<MentorshipNote>,
    private readonly mentorshipPolicy: MentorshipPolicy,
    private readonly mentorshipService: MentorshipService,
    private readonly visibilityPolicy: MentorshipVisibilityPolicy,
  ) {}

  async execute(
    noteId: string,
    dto: UpdateNoteDto,
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
    
    if (!this.visibilityPolicy.canEditNote(executor, note)) {
      throw new ForbiddenException('No tienes permisos para editar esta nota.');
    }

    if (dto.meetingId) {
      const meeting = await this.mentorshipService.findMeetingById(dto.meetingId, executor.churchId);
      if (!meeting || meeting.processId !== process.id) {
        throw new BadRequestException('El encuentro especificado no pertenece a este proceso de mentoría.');
      }
      note.meetingId = dto.meetingId;
    }

    if (dto.title !== undefined) note.title = dto.title;
    if (dto.content !== undefined) note.content = dto.content;
    if (dto.type !== undefined) {
      this.mentorshipPolicy.validateNoteAddition(process.mode, dto.type);
      note.type = dto.type;
    }

    return await this.noteRepository.save(note);
  }
}
