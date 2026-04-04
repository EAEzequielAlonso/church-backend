import { MentorshipProcess } from '../entities/mentorship-process.entity';
import { MentorshipProcessParticipant } from '../entities/mentorship-process-participant.entity';
import { AddParticipantToProcessDto } from '../dto/mentorship-mutation.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { MentorshipService } from '../services/mentorship.service';
import { MentorshipPolicy } from '../policies/mentorship.policy';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MentorshipRole, ParticipantStatus, MentorshipMode } from '../enums/mentorship.enum';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class AddParticipantToProcessUseCase {
  constructor(
    private readonly mentorshipService: MentorshipService,
    private readonly mentorshipPolicy: MentorshipPolicy,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: AddParticipantToProcessDto, churchId: string): Promise<MentorshipProcess> {
    const process = await this.mentorshipService.findById(dto.processId, churchId);

    if (!process) {
      throw new NotFoundException(`El proceso de mentoría con ID ${dto.processId} no existe.`);
    }

    this.mentorshipPolicy.assertActive(process.status);

    if (process.mode === MentorshipMode.INFORMAL) {
      throw new BadRequestException('Las invitaciones solo están disponibles en procesos formales.');
    }

    const mentorsCount = process.participants?.filter((p) => p.role === MentorshipRole.MENTOR).length || 0;
    const menteesCount = process.participants?.filter((p) => p.role === MentorshipRole.PARTICIPANT).length || 0;

    this.mentorshipPolicy.validateParticipantAddition(process.type, dto.role, mentorsCount, menteesCount);

    const participant = new MentorshipProcessParticipant();
    participant.churchPersonId = dto.churchPersonId;
    participant.role = dto.role;
    participant.status = this.mentorshipPolicy.calculateParticipantStatus(
      process.mode,
      dto.role,
      dto.hasUserAccount,
    );

    if (participant.status === ParticipantStatus.AUTO_ACCEPTED || participant.status === ParticipantStatus.ACCEPTED) {
      participant.joinedAt = new Date();
    }

    if (!process.participants) {
      process.participants = [];
    }
    process.participants.push(participant);

    const savedProcess = await this.mentorshipService.save(process);

    this.eventEmitter.emit('MentorshipParticipantAddedEvent', {
      processId: savedProcess.id,
      churchPersonId: participant.churchPersonId,
      role: participant.role,
    });

    return savedProcess;
  }
}
