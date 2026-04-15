import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MinistryMeeting } from '../entities/ministry-meeting.entity';

@Injectable()
export class GetMinistryEventsUseCase {
    constructor(
        @InjectRepository(MinistryMeeting)
        private readonly meetingRepo: Repository<MinistryMeeting>,
    ) { }

    async execute(ministryId: string): Promise<MinistryMeeting[]> {
        return this.meetingRepo.find({
            where: { ministryId },
            relations: ['calendarEvent', 'meetingNote', 'meetingNote.createdBy'],
            order: {
                calendarEvent: {
                    startDate: 'ASC',
                },
            },
        });
    }
}
