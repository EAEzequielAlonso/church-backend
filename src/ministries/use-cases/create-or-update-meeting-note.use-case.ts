import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingNote } from '../entities/meeting-note.entity';
import { CalendarEvent } from '../../agenda/entities/calendar-event.entity';
import { Person } from '../../users/entities/person.entity';
import { CreateOrUpdateMeetingNoteDto } from '../dto/create-or-update-meeting-note.dto';
import { MinistryPolicy } from '../policies/ministry.policy';
import { SystemRole, FunctionalRole } from '../../common/enums';

@Injectable()
export class CreateOrUpdateMeetingNoteUseCase {
    constructor(
        @InjectRepository(MeetingNote)
        private readonly noteRepo: Repository<MeetingNote>,
        @InjectRepository(CalendarEvent)
        private readonly eventRepo: Repository<CalendarEvent>,
        private readonly ministryPolicy: MinistryPolicy,
    ) { }

    async execute(
        eventId: string,
        personId: string,
        churchId: string, // Needed to ensure the user matches the tenant
        ministryId: string, // Decoupled from service, passed from controller to authorize
        data: CreateOrUpdateMeetingNoteDto,
        systemRole: SystemRole,
        functionalRole: FunctionalRole
    ): Promise<MeetingNote> {

        // First ensure they are leader or coordinator of the Ministry that owns this event
        await this.ministryPolicy.assertCanManage(ministryId, personId, churchId, systemRole, functionalRole);

        let note: MeetingNote | null = await this.noteRepo.findOne({
            where: { eventId },
        });

        if (!note) {
            note = this.noteRepo.create({
                eventId,
                createdById: personId,
            });
        }

        note.summary = data.content;
        note.decisions = data.summary;
        note.nextSteps = data.attendanceInfo;

        return this.noteRepo.save(note);
    }
}
