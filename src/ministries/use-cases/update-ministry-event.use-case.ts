import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MinistryPolicy } from '../policies/ministry.policy';
import { MinistryMeeting } from '../entities/ministry-meeting.entity';
import { AgendaSyncService } from '../../agenda/agenda-sync.service';
import { CreateMinistryEventDto } from '../dto/create-ministry-event.dto';
import { SystemRole, FunctionalRole } from '../../common/enums';
import { EventSourceType, CalendarEventType } from '../../common/enums';

@Injectable()
export class UpdateMinistryEventUseCase {
    constructor(
        @InjectRepository(MinistryMeeting)
        private readonly meetingRepo: Repository<MinistryMeeting>,
        private readonly ministryPolicy: MinistryPolicy,
        private readonly agendaSyncService: AgendaSyncService,
    ) { }

    async execute(
        ministryId: string,
        meetingId: string,
        personId: string,
        churchId: string,
        data: Partial<CreateMinistryEventDto>,
        systemRole: SystemRole,
        functionalRole: FunctionalRole
    ): Promise<MinistryMeeting> {
        await this.ministryPolicy.assertCanManage(ministryId, personId, churchId, systemRole, functionalRole);

        const meeting = await this.meetingRepo.findOne({ where: { id: meetingId, ministryId } });
        if (!meeting) {
            throw new NotFoundException('Ministry meeting not found');
        }

        const updatePayload: any = {};

        if (data.title !== undefined) updatePayload.title = data.title;
        
        if (data.description !== undefined || data.type !== undefined) {
            const subType =
                data.type && data.type !== CalendarEventType.MINISTRY
                    ? `[${data.type}] `
                    : '';
            updatePayload.description = subType + (data.description || '');
        }

        if (data.startDate !== undefined) {
            const startDate = new Date(data.startDate);
            updatePayload.startDate = startDate;

            if (data.endDate !== undefined) {
                updatePayload.endDate = new Date(data.endDate);
            } else {
                updatePayload.endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour
            }
        } else if (data.endDate !== undefined) {
            updatePayload.endDate = new Date(data.endDate);
        }

        if (data.location !== undefined) updatePayload.location = data.location;

        const savedMeeting = await this.meetingRepo.save(meeting);

        if (Object.keys(updatePayload).length > 0) {
            await this.agendaSyncService.updateProjection(
                EventSourceType.MINISTRY_MEETING,
                meeting.id,
                updatePayload
            );
        }

        return savedMeeting;
    }
}
