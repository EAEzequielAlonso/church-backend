import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ministry } from '../entities/ministry.entity';

@Injectable()
export class GetMinistryUseCase {
    constructor(
        @InjectRepository(Ministry)
        private readonly ministryRepo: Repository<Ministry>,
    ) { }

    async execute(id: string, churchId: string): Promise<any> {
        const ministry = await this.ministryRepo.findOne({
            where: { id, churchId },
            relations: [
                'leader',
                'leader.person',
                'members',
                'members.member.person',
                'members.member.church',
                'tasks',
                'tasks.assignedTo',
                'tasks.assignedTo.person',
                'serviceDuties',
                'meetings',
                'meetings.calendarEvent',
                'meetings.meetingNote',
                'meetings.meetingNote.createdBy',
            ],
        });

        if (!ministry) throw new NotFoundException('Ministerio no encontrado');
        return ministry;
    }
}
