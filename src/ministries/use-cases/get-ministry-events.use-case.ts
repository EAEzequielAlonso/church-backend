import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarEvent } from '../../agenda/entities/calendar-event.entity';
import { CalendarEventType } from 'src/common/enums';

@Injectable()
export class GetMinistryEventsUseCase {
    constructor(
        @InjectRepository(CalendarEvent)
        private readonly eventRepo: Repository<CalendarEvent>,
    ) { }

    async execute(ministryId: string): Promise<CalendarEvent[]> {
        return this.eventRepo.find({
            where: { type: CalendarEventType.MINISTRY, ownerId: ministryId },
            order: { startDate: 'ASC' },
        });
    }
}
