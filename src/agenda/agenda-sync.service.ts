import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarEvent } from './entities/calendar-event.entity';
import { EventSourceType } from '../common/enums';
import { SyncProjectionDto } from './dto/sync-projection.dto';

@Injectable()
export class AgendaSyncService {
    private readonly logger = new Logger(AgendaSyncService.name);

    constructor(
        @InjectRepository(CalendarEvent)
        private readonly calendarEventRepo: Repository<CalendarEvent>,
    ) {}

    async createProjection(dto: SyncProjectionDto): Promise<CalendarEvent> {
        const event = this.calendarEventRepo.create(dto);
        return await this.calendarEventRepo.save(event);
    }

    async updateProjection(sourceType: EventSourceType, sourceId: string, dto: Partial<SyncProjectionDto>): Promise<CalendarEvent | null> {
        const event = await this.calendarEventRepo.findOne({
            where: { sourceType, sourceId },
            relations: ['attendees'] // Fetch attendees in case we need to update/replace them 
        });

        if (!event) {
            this.logger.warn(`No se encontró proyección para actualizar: ${sourceType} - ${sourceId}`);
            return null;
        }

        Object.assign(event, dto);
        return await this.calendarEventRepo.save(event);
    }

    async deleteProjection(sourceType: EventSourceType, sourceId: string): Promise<void> {
        const event = await this.calendarEventRepo.findOne({
            where: { sourceType, sourceId },
        });

        if (event) {
            await this.calendarEventRepo.remove(event);
        }
    }
}
