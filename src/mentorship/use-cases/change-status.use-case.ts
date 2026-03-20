import { MentorshipProcess } from '../entities/mentorship-process.entity';
import { ChangeMentorshipStatusDto } from '../dto/mentorship-mutation.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { MentorshipService } from '../services/mentorship.service';
import { MentorshipPolicy } from '../policies/mentorship.policy';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MentorshipStatus } from '../enums/mentorship.enum';

@Injectable()
export class ChangeMentorshipStatusUseCase {
  constructor(
    private readonly mentorshipService: MentorshipService,
    private readonly mentorshipPolicy: MentorshipPolicy,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: ChangeMentorshipStatusDto): Promise<MentorshipProcess> {
    const process = await this.mentorshipService.findById(dto.processId);

    if (!process) {
      throw new NotFoundException(`El proceso de mentoría con ID ${dto.processId} no existe.`);
    }

    this.mentorshipPolicy.assertNotClosed(process.status);
    this.mentorshipPolicy.validateStatusChange(dto.newStatus, dto.closeObservation);

    process.status = dto.newStatus;
    if (dto.newStatus === MentorshipStatus.CLOSED) {
      process.closeObservation = dto.closeObservation;
      process.endDate = new Date();
    }

    const savedProcess = await this.mentorshipService.save(process);

    this.eventEmitter.emit('MentorshipStatusChangedEvent', {
      processId: savedProcess.id,
      newStatus: process.status,
    });

    return savedProcess;
  }
}
