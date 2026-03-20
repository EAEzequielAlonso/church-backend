import { MentorshipProcess } from '../entities/mentorship-process.entity';
import { MentorshipProcessParticipant } from '../entities/mentorship-process-participant.entity';
import { AddParticipantToProcessDto } from '../dto/mentorship-mutation.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { MentorshipService } from '../services/mentorship.service';
import { MentorshipPolicy } from '../policies/mentorship.policy';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MentorshipRole } from '../enums/mentorship.enum';

@Injectable()
export class AddParticipantToProcessUseCase {
  constructor(
    private readonly mentorshipService: MentorshipService,
    private readonly mentorshipPolicy: MentorshipPolicy,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: AddParticipantToProcessDto): Promise<MentorshipProcess> {
    const process = await this.mentorshipService.findById(dto.processId);

    if (!process) {
      throw new NotFoundException(`El proceso de mentoría con ID ${dto.processId} no existe.`);
    }

    this.mentorshipPolicy.assertActive(process.status);

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
