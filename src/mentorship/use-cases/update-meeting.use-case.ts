import { Injectable, NotFoundException } from '@nestjs/common';
import { MentorshipService } from '../services/mentorship.service';
import { MentorshipMeeting } from '../entities/mentorship-meeting.entity';
import { AgendaSyncService } from '../../agenda/agenda-sync.service';
import { EventSourceType } from '../../common/enums';
// Reusing AddMeetingDto but making fields optional, assuming DTO exists or handling manually
import { AddMeetingDto } from '../dto/mentorship-content.dto';
import { MentorshipPolicy } from '../policies/mentorship.policy';

interface UpdateMeetingDto extends Partial<AddMeetingDto> {}

@Injectable()
export class UpdateMeetingUseCase {
  constructor(
    private readonly mentorshipService: MentorshipService,
    private readonly agendaSyncService: AgendaSyncService,
    private readonly mentorshipPolicy: MentorshipPolicy,
  ) {}

  async execute(
    processId: string,
    meetingId: string,
    dto: UpdateMeetingDto,
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

    const meeting = process.meetings?.find(m => m.id === meetingId);
    if (!meeting) {
        throw new NotFoundException(`El encuentro no existe en este proceso.`);
    }

    const updatePayload: any = {};

    if (dto.title !== undefined) meeting.title = dto.title;
    if (dto.description !== undefined) {
        meeting.description = dto.description;
        updatePayload.description = dto.description;
    }
    if (dto.scheduledDate !== undefined) {
        meeting.scheduledDate = dto.scheduledDate;
        updatePayload.startDate = dto.scheduledDate;
    }
    if (dto.endDate !== undefined) {
        meeting.endDate = dto.endDate;
        updatePayload.endDate = dto.endDate;
    } else if (dto.scheduledDate) {
        updatePayload.endDate = new Date(new Date(dto.scheduledDate).getTime() + 60 * 60 * 1000);
        meeting.endDate = updatePayload.endDate;
    }
    if (dto.location !== undefined) {
        meeting.location = dto.location;
        updatePayload.location = dto.location;
    }
    if (dto.type !== undefined) meeting.type = dto.type;

    if (dto.title !== undefined && process.motive) {
       updatePayload.title = dto.title || `Encuentro: ${process.motive}`;
    }

    const savedProcess = await this.mentorshipService.save(process);

    if (Object.keys(updatePayload).length > 0) {
        await this.agendaSyncService.updateProjection(
            EventSourceType.MENTORSHIP_MEETING,
            meeting.id,
            updatePayload
        );
    }

    return savedProcess;
  }
}
