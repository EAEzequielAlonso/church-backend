import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MentorshipService } from '../services/mentorship.service';
import { MentorshipPolicy } from '../policies/mentorship.policy';
import { UpdateMentorshipProcessDto } from '../dto/update-mentorship-process.dto';
import { MentorshipProcess } from '../entities/mentorship-process.entity';
import { MentorshipStatus } from '../enums/mentorship.enum';

@Injectable()
export class UpdateMentorshipProcessUseCase {
  constructor(
    private readonly mentorshipService: MentorshipService,
    private readonly mentorshipPolicy: MentorshipPolicy,
  ) {}

  async execute(
    processId: string,
    dto: UpdateMentorshipProcessDto,
    churchId: string,
    executorChurchPersonId: string,
    executorRoles: string[],
  ): Promise<MentorshipProcess> {
    const process = await this.mentorshipService.findById(processId, churchId);

    if (!process) {
      throw new NotFoundException(`El proceso de mentoría con ID ${processId} no existe.`);
    }

    // --- 1. Validación de Permisos (Admin o Mentor del proceso) ---
    this.mentorshipPolicy.assertCanManage(executorChurchPersonId, executorRoles, process);

    // --- 2. Validación de Estado (Si está CLOSED, no permite edición) ---
    if (process.status === MentorshipStatus.CLOSED) {
      throw new BadRequestException('El proceso está CERRADO y no permite más modificaciones.');
    }

    // --- 3. Validación de Cambio de Estado y Observaciones ---
    if (dto.status) {
      if (dto.status === MentorshipStatus.CLOSED && !dto.closeObservation) {
        throw new BadRequestException('Se requiere una observación (closeObservation) para cerrar el proceso.');
      }
      process.status = dto.status;
    }

    if (dto.closeObservation) {
      process.closeObservation = dto.closeObservation;
    }

    // --- 4. Actualización de Datos Generales ---
    if (dto.motive) {
      process.motive = dto.motive;
    }

    return this.mentorshipService.save(process);
  }
}
