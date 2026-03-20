import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingNote } from '../entities/meeting-note.entity';

@Injectable()
export class GetMeetingNoteUseCase {
    constructor(
        @InjectRepository(MeetingNote)
        private readonly noteRepo: Repository<MeetingNote>,
    ) { }

    async execute(meetingId: string): Promise<MeetingNote | null> {
        return this.noteRepo.findOne({
            where: { meetingId },
            relations: ['createdBy'],
        });
    }
}
