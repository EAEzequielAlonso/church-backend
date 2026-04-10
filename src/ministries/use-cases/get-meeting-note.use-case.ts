import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingNote } from '../entities/meeting-note.entity';
import { MinistryMeeting } from '../entities/ministry-meeting.entity';

@Injectable()
export class GetMeetingNoteUseCase {
    constructor(
        @InjectRepository(MeetingNote)
        private readonly noteRepo: Repository<MeetingNote>,
        @InjectRepository(MinistryMeeting)
        private readonly meetingRepo: Repository<MinistryMeeting>,
    ) { }

    async execute(meetingId: string): Promise<MeetingNote | null> {
        // Try to find the meeting first to resolve ID
        const meeting = await this.meetingRepo.findOne({
            where: [
                { id: meetingId },
                { calendarEventId: meetingId }
            ]
        });

        if (!meeting) {
            return null;
        }

        return this.noteRepo.findOne({
            where: { meetingId: meeting.id },
            relations: ['createdBy'],
        });
    }
}
