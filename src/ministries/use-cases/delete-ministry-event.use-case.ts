import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MinistryPolicy } from '../policies/ministry.policy';
import { MinistryMeeting } from '../entities/ministry-meeting.entity';
import { AgendaSyncService } from '../../agenda/agenda-sync.service';
import { SystemRole, FunctionalRole } from '../../common/enums';
import { EventSourceType } from '../../common/enums';

@Injectable()
export class DeleteMinistryEventUseCase {
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
        systemRole: SystemRole,
        functionalRole: FunctionalRole
    ): Promise<void> {
        await this.ministryPolicy.assertCanManage(ministryId, personId, churchId, systemRole, functionalRole);

        const meeting = await this.meetingRepo.findOne({ where: { id: meetingId, ministryId } });
        if (!meeting) {
            throw new NotFoundException('Ministry meeting not found');
        }

        await this.agendaSyncService.deleteProjection(EventSourceType.MINISTRY_MEETING, meeting.id);
        await this.meetingRepo.remove(meeting);
    }
}
