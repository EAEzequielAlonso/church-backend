import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingNote } from '../entities/meeting-note.entity';
import { MinistryMeeting } from '../entities/ministry-meeting.entity';
import { Person } from '../../users/entities/person.entity';
import { CreateOrUpdateMeetingNoteDto } from '../dto/create-or-update-meeting-note.dto';
import { MinistryPolicy } from '../policies/ministry.policy';
import { SystemRole, FunctionalRole } from '../../common/enums';

@Injectable()
export class CreateOrUpdateMeetingNoteUseCase {
    constructor(
        @InjectRepository(MeetingNote)
        private readonly noteRepo: Repository<MeetingNote>,
        @InjectRepository(MinistryMeeting)
        private readonly meetingRepo: Repository<MinistryMeeting>,
        private readonly ministryPolicy: MinistryPolicy,
    ) { }

    async execute(
        meetingId: string,
        personId: string,
        churchId: string,
        ministryId: string,
        data: CreateOrUpdateMeetingNoteDto,
        systemRole: SystemRole,
        functionalRole: FunctionalRole
    ): Promise<MeetingNote> {
        // First ensure they are leader or coordinator
        await this.ministryPolicy.assertCanManage(ministryId, personId, churchId, systemRole, functionalRole);

        // RESOLVE ID: Find the actual MinistryMeeting
        // It could be that meetingId is the native ID or the calendarEventId
        let meeting = await this.meetingRepo.findOne({
            where: { id: meetingId, ministryId }
        });

        if (!meeting) {
            meeting = await this.meetingRepo.findOne({
                where: { calendarEventId: meetingId, ministryId }
            });
        }

        if (!meeting) {
            throw new NotFoundException('Ministry meeting not found');
        }

        const actualMeetingId = meeting.id;

        let note: MeetingNote | null = await this.noteRepo.findOne({
            where: { meetingId: actualMeetingId },
        });

        if (!note) {
            note = this.noteRepo.create({
                meetingId: actualMeetingId,
                createdById: personId,
            });
        }

        note.summary = data.summary;
        note.decisions = data.decisions;
        note.nextSteps = data.nextSteps;

        return this.noteRepo.save(note);
    }
}
