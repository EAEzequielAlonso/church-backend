import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { validate as isUUID } from 'uuid';
import { MentorshipNote } from '../entities/mentorship-note.entity';
import { MentorshipService } from '../services/mentorship.service';
import { MentorshipPolicy } from '../policies/mentorship.policy';
import { GetNotesDto } from '../dto/get-notes.dto';
import { MentorshipVisibilityPolicy } from '../policies/mentorship.visibility-policy';

@Injectable()
export class GetNotesUseCase {
  constructor(
    @InjectRepository(MentorshipNote)
    private readonly noteRepository: Repository<MentorshipNote>,
    private readonly mentorshipService: MentorshipService,
    private readonly mentorshipPolicy: MentorshipPolicy,
    private readonly visibilityPolicy: MentorshipVisibilityPolicy,
  ) {}

  async execute(
    processId: string,
    dto: GetNotesDto,
    executor: {
      userId: string;
      roles: string[];
      permissions: string[];
      churchId: string;
    },
  ) {
    const process = await this.mentorshipService.findById(processId, executor.churchId);
    if (!process) {
      throw new NotFoundException(`El proceso de mentoría con ID ${processId} no existe.`);
    }

    // Determinar el rol específico del usuario en ESTE proceso
    const processRole = process.participants?.find(p => p.churchPersonId === executor.userId)?.role;
    const isManager = this.mentorshipPolicy.canManageProcess(executor.userId, executor.roles, process);
    const isParticipant = !!processRole;
    
    const visibleTypes = this.visibilityPolicy.getVisibleNoteTypes(executor, isManager, isParticipant, processRole);

    if (visibleTypes.length === 0) {
      throw new ForbiddenException('No tienes permiso para ver las notas de este proceso.');
    }

    // 2. Query con filtros
    const query = this.noteRepository.createQueryBuilder('note')
      .leftJoinAndSelect('note.meeting', 'meeting')
      .leftJoinAndSelect('meeting.calendarEvent', 'calendarEvent')
      .where('note.processId = :processId', { processId })
      .andWhere('note.type IN (:...visibleTypes)', { visibleTypes });

    if (dto.meetingId) {
      if (dto.meetingId === 'none') {
        query.andWhere('note.meetingId IS NULL');
      } else if (isUUID(dto.meetingId)) {
        query.andWhere('note.meetingId = :meetingId', { meetingId: dto.meetingId });
      } else {
        throw new BadRequestException('El meetingId proporcionado no es válido (debe ser UUID o "none").');
      }
    }

    if (dto.type) {
      if (visibleTypes.includes(dto.type)) {
        query.andWhere('note.type = :type', { type: dto.type });
      } else {
        query.andWhere('1 = 0'); 
      }
    }

    const total = await query.getCount();
    const pageNumber = Math.max(1, dto.page || 1);
    const lastPage = Math.ceil(total / 10);
    
    // Si la página es mayor que la última, ir a la última
    const currentPage = (lastPage > 0 && pageNumber > lastPage) ? lastPage : pageNumber;

    const data = await query
      .orderBy('note.createdAt', 'DESC')
      .addOrderBy('note.id', 'DESC')
      .skip((currentPage - 1) * 10)
      .take(10)
      .getMany();

    const normalizedData = data.map((note) => ({
      ...note,
      meeting: note.meeting
        ? {
            id: note.meeting.id,
            title: note.meeting.calendarEvent?.title,
            scheduledDate: note.meeting.calendarEvent?.startDate,
            endDate: note.meeting.calendarEvent?.endDate,
            location: note.meeting.calendarEvent?.location,
          }
        : null,
    }));

    return {
      data: normalizedData,
      total,
      page: currentPage,
      lastPage
    };
  }
}
