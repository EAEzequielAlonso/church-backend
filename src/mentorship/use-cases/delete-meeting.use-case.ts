import { Injectable, NotFoundException } from '@nestjs/common';
import { MentorshipService } from '../services/mentorship.service';
import { AgendaSyncService } from '../../agenda/agenda-sync.service';
import { EventSourceType } from '../../common/enums';
import { MentorshipPolicy } from '../policies/mentorship.policy';

@Injectable()
export class DeleteMeetingUseCase {
  constructor(
    private readonly mentorshipService: MentorshipService,
    private readonly agendaSyncService: AgendaSyncService,
    private readonly mentorshipPolicy: MentorshipPolicy,
  ) {}

  async execute(
    processId: string,
    meetingId: string,
    executorChurchPersonId: string,
    executorRoles: string[] = [],
    churchId: string,
  ) {
    const process = await this.mentorshipService.findById(processId, churchId);

    if (!process) {
      throw new NotFoundException(`El proceso de mentoría con ID ${processId} no existe.`);
    }

    this.mentorshipPolicy.assertActive(process.status);
    this.mentorshipPolicy.assertCanManage(executorChurchPersonId, executorRoles, process);

    const meetingIndex = process.meetings?.findIndex(m => m.id === meetingId);
    if (meetingIndex === undefined || meetingIndex === -1) {
        throw new NotFoundException(`El encuentro no existe en este proceso.`);
    }

    // Call projection first
    await this.agendaSyncService.deleteProjection(EventSourceType.MENTORSHIP_MEETING, meetingId);

    // Remove meeting from array
    process.meetings.splice(meetingIndex, 1);
    
    return await this.mentorshipService.save(process);
  }
}
