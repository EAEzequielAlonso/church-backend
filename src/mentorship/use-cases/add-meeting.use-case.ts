import { MentorshipProcess } from '../entities/mentorship-process.entity';
import { MentorshipMeeting } from '../entities/mentorship-meeting.entity';
import { AddMeetingDto } from '../dto/mentorship-content.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { MentorshipService } from '../services/mentorship.service';
import { MentorshipPolicy } from '../policies/mentorship.policy';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AgendaSyncService } from '../../agenda/agenda-sync.service';
import { EventSourceType, CalendarEventType } from '../../common/enums';
import { MentorshipType } from '../enums/mentorship.enum';

@Injectable()
export class AddMeetingUseCase {
  constructor(
    private readonly mentorshipService: MentorshipService,
    private readonly mentorshipPolicy: MentorshipPolicy,
    private readonly eventEmitter: EventEmitter2,
    private readonly agendaSyncService: AgendaSyncService,
  ) {}

  async execute(
    dto: AddMeetingDto,
    executorChurchPersonId: string,
    executorRoles: string[] = [],
    churchId: string,
  ): Promise<MentorshipProcess> {
    const process = await this.mentorshipService.findById(dto.processId, churchId);

    if (!process) {
      throw new NotFoundException(`El proceso de mentoría con ID ${dto.processId} no existe.`);
    }

    this.mentorshipPolicy.assertActive(process.status);
    this.mentorshipPolicy.assertCanManage(executorChurchPersonId, executorRoles, process);

    const meeting = new MentorshipMeeting();

    if (!process.meetings) {
      process.meetings = [];
    }
    process.meetings.push(meeting);

    const savedProcess = await this.mentorshipService.save(process);

    // The newly created meeting is the last one in the array
    const savedMeeting = savedProcess.meetings[savedProcess.meetings.length - 1];

    const attendees = savedProcess.participants
        .filter(p => p.churchPerson && p.churchPerson.person)
        .map(p => p.churchPerson.person);

    const projectionEventType = process.type === MentorshipType.DISCIPLESHIP 
        ? CalendarEventType.DISCIPLESHIP 
        : CalendarEventType.COUNSELING;

    const startDate = dto.scheduledDate;
    const endDate = dto.endDate || new Date(new Date(startDate).getTime() + 60 * 60 * 1000);

    const projection = await this.agendaSyncService.createProjection({
        title: dto.title || `Encuentro: ${process.motive}`,
        description: dto.description,
        startDate: startDate,
        endDate: endDate,
        location: dto.location,
        sourceType: EventSourceType.MENTORSHIP_MEETING,
        sourceId: savedMeeting.id,
        type: projectionEventType,
        attendees: attendees,
    });

    savedMeeting.calendarEventId = projection.id;
    await this.mentorshipService.save(savedProcess); // second save to persist calendarEventId

    this.eventEmitter.emit('MentorshipMeetingAddedEvent', {
      processId: savedProcess.id,
      meetingTitle: dto.title,
    });

    return savedProcess;
  }
}
