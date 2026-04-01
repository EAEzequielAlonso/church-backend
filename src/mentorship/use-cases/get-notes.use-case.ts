import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MentorshipNote } from '../entities/mentorship-note.entity';
import { MentorshipService } from '../services/mentorship.service';
import { MentorshipPolicy } from '../policies/mentorship.policy';
import { GetNotesDto } from '../dto/get-notes.dto';
import { MentorshipNoteType, MentorshipRole } from '../enums/mentorship.enum';
import { AppPermission } from '../../auth/authorization/permissions.enum';

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

    const isManager = this.mentorshipPolicy.canManageProcess(executor.userId, executor.roles, process);
    const isParticipant = process.participants?.some(p => p.churchPersonId === executor.userId);
    
    const visibleTypes = this.visibilityPolicy.getVisibleNoteTypes(executor, isManager, isParticipant);

    if (visibleTypes.length === 0) {
      throw new ForbiddenException('No tienes permiso para ver las notas de este proceso.');
    }

    // 2. Query con filtros
    const query = this.noteRepository.createQueryBuilder('note')
      .where('note.processId = :processId', { processId })
      .andWhere('note.type IN (:...visibleTypes)', { visibleTypes });

    if (dto.meetingId) {
      query.andWhere('note.meetingId = :meetingId', { meetingId: dto.meetingId });
    }

    if (dto.type) {
      // Si se pide un tipo específico, filtramos sobre los permitidos
      if (visibleTypes.includes(dto.type)) {
        query.andWhere('note.type = :type', { type: dto.type });
      } else {
        // Si pide algo que no puede ver, devolvemos vacío o lanzamos error?
        // Devolvemos vacío forzando una condición imposible o simplemente ignoramos el filtro y devolvemos lo que puede ver.
        // Lo más seguro es que si pide algo prohibido, devuelva vacío.
        query.andWhere('1 = 0'); 
      }
    }

    // Si es guiado (isParticipant y NO es mentor), ocultar notas internas de OTROS mentores (si hubiera más de uno)
    // Pero en realidad INTERNAL es para mentores, así que no debería verlas de todos modos.
    // El filtro de visibleTypes ya se encarga de eso.

    return await query.orderBy('note.createdAt', 'DESC').getMany();
  }
}
