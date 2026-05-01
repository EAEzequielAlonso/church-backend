import { MentorshipProcess } from '../entities/mentorship-process.entity';
import { ChangeMentorshipStatusDto } from '../dto/mentorship-mutation.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { MentorshipService } from '../services/mentorship.service';
import { MentorshipPolicy } from '../policies/mentorship.policy';
import { MentorshipStatus } from '../enums/mentorship.enum';

@Injectable()
export class ChangeMentorshipStatusUseCase {
  constructor(
    private readonly mentorshipService: MentorshipService,
    private readonly mentorshipPolicy: MentorshipPolicy,
  ) {}

  async execute(dto: ChangeMentorshipStatusDto, churchId: string): Promise<MentorshipProcess> {
    const process = await this.mentorshipService.findById(dto.processId, churchId);

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

    return savedProcess;
  }
}
