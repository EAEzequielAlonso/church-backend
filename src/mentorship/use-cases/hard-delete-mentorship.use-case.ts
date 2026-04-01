import { HardDeleteMentorshipProcessDto } from '../dto/hard-delete-mentorship.dto';
import { MentorshipRole } from '../enums/mentorship.enum';
import { Injectable, BadRequestException } from '@nestjs/common';
import { MentorshipService } from '../services/mentorship.service';

@Injectable()
export class HardDeleteMentorshipProcessUseCase {
  constructor(private readonly mentorshipService: MentorshipService) {}

  async execute(dto: HardDeleteMentorshipProcessDto, churchId: string): Promise<void> {
    if (dto.confirmString !== 'ELIMINAR PROCESO DEFINITIVAMENTE') {
      throw new BadRequestException(
        'El string de confirmación es incorrecto. La operación ha sido abortada.',
      );
    }

    const process = await this.mentorshipService.findById(dto.processId, churchId);

    if (!process) {
      throw new BadRequestException(
        `El proceso de mentoría con ID ${dto.processId} no existe.`,
      );
    }

    const isAdminOrAuditor =
      dto.executorFunctionalRoles.includes('ADMIN_CHURCH') ||
      dto.executorFunctionalRoles.includes('AUDITOR');

    let isMentorOfTheProcess = false;
    if (process.participants) {
      isMentorOfTheProcess = process.participants.some(
        (p) =>
          p.churchPersonId === dto.executorChurchPersonId &&
          p.role === MentorshipRole.MENTOR,
      );
    }

    if (!isAdminOrAuditor && !isMentorOfTheProcess) {
      throw new BadRequestException(
        'Permisos insuficientes. Solo un MENTOR asignado al proceso, un ADMIN_CHURCH o un AUDITOR pueden eliminar definitivamente el proceso.',
      );
    }

    await this.mentorshipService.hardDelete(process.id, churchId);
  }
}
