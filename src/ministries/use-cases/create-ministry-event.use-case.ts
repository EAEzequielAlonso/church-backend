import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MinistryPolicy } from '../policies/ministry.policy';
import { CalendarEvent } from '../../agenda/entities/calendar-event.entity';
import { Person } from '../../users/entities/person.entity';
import { CreateMinistryEventDto } from '../dto/create-ministry-event.dto';
import { EventSourceType, CalendarEventType } from '../../common/enums';
import { SystemRole, FunctionalRole } from '../../common/enums';
import { Ministry } from '../entities/ministry.entity';
import { MinistryMeeting } from '../entities/ministry-meeting.entity';
import { AgendaSyncService } from '../../agenda/agenda-sync.service';

@Injectable()
export class CreateMinistryEventUseCase {
    constructor(
        @InjectRepository(MinistryMeeting)
        private readonly meetingRepo: Repository<MinistryMeeting>,
        @InjectRepository(Ministry)
        private readonly ministryRepo: Repository<Ministry>,
        private readonly ministryPolicy: MinistryPolicy,
        private readonly agendaSyncService: AgendaSyncService,
    ) { }

    async execute(
        ministryId: string,
        personId: string,
        churchId: string,
        data: CreateMinistryEventDto,
        systemRole: SystemRole,
        functionalRole: FunctionalRole
    ): Promise<MinistryMeeting> {

        await this.ministryPolicy.assertCanManage(ministryId, personId, churchId, systemRole, functionalRole);

        const ministry = await this.ministryRepo.findOne({ where: { id: ministryId, churchId } });
        if (!ministry) {
            throw new NotFoundException('Ministry not found');
        }

        const subType =
            data.type && data.type !== CalendarEventType.MINISTRY
                ? `[${data.type}] `
                : '';
        const description = subType + (data.description || '');

        const startDate = new Date(data.startDate);
        const endDate = new Date(data.endDate);

        let meeting = this.meetingRepo.create({
            ministryId: ministryId,
        });

        meeting = await this.meetingRepo.save(meeting);

        const projection = await this.agendaSyncService.createProjection({
            title: data.title,
            description: description,
            startDate: startDate,
            endDate: endDate,
            location: data.location,
            sourceType: EventSourceType.MINISTRY_MEETING,
            sourceId: meeting.id,
            ownerId: ministryId,
            type: CalendarEventType.MINISTRY,
        });

        meeting.calendarEventId = projection.id;
        return this.meetingRepo.save(meeting);
    }
}
