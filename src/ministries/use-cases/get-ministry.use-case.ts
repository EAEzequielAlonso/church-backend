import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ministry } from '../entities/ministry.entity';
import { CalendarEvent } from '../../agenda/entities/calendar-event.entity';

@Injectable()
export class GetMinistryUseCase {
    constructor(
        @InjectRepository(Ministry)
        private readonly ministryRepo: Repository<Ministry>,
        @InjectRepository(CalendarEvent)
        private readonly eventRepo: Repository<CalendarEvent>,
    ) { }

    async execute(id: string): Promise<any> {
        const ministry = await this.ministryRepo.findOne({
            where: { id },
            relations: [
                'leader',
                'leader.person',
                'members',
                'members.member.person',
                'members.member.church',
                'tasks',
                'tasks.assignedTo',
                'tasks.assignedTo.person',
            ],
        });

        if (!ministry) throw new NotFoundException('Ministerio no encontrado');

        const events = await this.eventRepo.find({
            where: { ownerId: id },
        });

        return {
            ...ministry,
            calendarEvents: events,
        };
    }
}
