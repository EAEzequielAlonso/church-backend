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
        churchId: string, // Needed to ensure the user matches the tenant
        ministryId: string, // Decoupled from service, passed from controller to authorize
        data: CreateOrUpdateMeetingNoteDto,
        systemRole: SystemRole,
        functionalRole: FunctionalRole
    ): Promise<MeetingNote> {

        // First ensure they are leader or coordinator of the Ministry that owns this event
        await this.ministryPolicy.assertCanManage(ministryId, personId, churchId, systemRole, functionalRole);

        let note: MeetingNote | null = await this.noteRepo.findOne({
            where: { meetingId },
        });

        if (!note) {
            note = this.noteRepo.create({
                meetingId,
                createdById: personId,
            });
        }

        note.summary = data.summary;
        note.decisions = data.decisions;
        note.nextSteps = data.nextSteps;

        return this.noteRepo.save(note);
    }
}
