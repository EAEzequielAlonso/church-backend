import { MentorshipProcess } from '../entities/mentorship-process.entity';
import { ApproveParticipantDto } from '../dto/mentorship-mutation.dto';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { MentorshipService } from '../services/mentorship.service';
import { MentorshipPolicy } from '../policies/mentorship.policy';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MentorshipMode, ParticipantStatus } from '../enums/mentorship.enum';

@Injectable()
export class ApproveParticipantUseCase {
  constructor(
    private readonly mentorshipService: MentorshipService,
    private readonly mentorshipPolicy: MentorshipPolicy,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: ApproveParticipantDto, churchId: string): Promise<MentorshipProcess> {
    const process = await this.mentorshipService.findById(dto.processId, churchId);

    if (!process) {
      throw new NotFoundException(`El proceso de mentoría con ID ${dto.processId} no existe.`);
    }

    this.mentorshipPolicy.assertActive(process.status);

    if (process.mode === MentorshipMode.INFORMAL) {
      throw new BadRequestException('Los procesos en modo INFORMAL no requieren aprobación manual de participantes.');
    }

    const participant = process.participants?.find((p) => p.churchPersonId === dto.churchPersonId);
    if (!participant) {
      throw new NotFoundException(`El participante con ID ${dto.churchPersonId} no forma parte de este proceso.`);
    }

    if (participant.status !== ParticipantStatus.PENDING) {
      throw new BadRequestException('El participante no está en estado PENDIENTE de aprobación.');
    }

    participant.status = ParticipantStatus.ACCEPTED;

    const savedProcess = await this.mentorshipService.save(process);

    this.eventEmitter.emit('MentorshipParticipantApprovedEvent', {
      processId: savedProcess.id,
      churchPersonId: participant.churchPersonId,
    });

    return savedProcess;
  }
}
