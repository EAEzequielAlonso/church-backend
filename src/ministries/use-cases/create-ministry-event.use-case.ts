import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MinistryPolicy } from '../policies/ministry.policy';
import { CalendarEvent } from '../../agenda/entities/calendar-event.entity';
import { Person } from '../../users/entities/person.entity';
import { CreateMinistryEventDto } from '../dto/create-ministry-event.dto';
import { CalendarEventType } from '../../common/enums';
import { SystemRole, FunctionalRole } from '../../common/enums';
import { Ministry } from '../entities/ministry.entity';

@Injectable()
export class CreateMinistryEventUseCase {
    constructor(
        @InjectRepository(CalendarEvent)
        private readonly eventRepo: Repository<CalendarEvent>,
        private readonly ministryPolicy: MinistryPolicy,
    ) { }

    async execute(
        ministryId: string,
        personId: string,
        churchId: string,
        data: CreateMinistryEventDto,
        systemRole: SystemRole,
        functionalRole: FunctionalRole
    ): Promise<CalendarEvent> {

        await this.ministryPolicy.assertCanManage(ministryId, personId, churchId, systemRole, functionalRole);

        const subType =
            data.type && data.type !== CalendarEventType.MINISTRY
                ? `[${data.type}] `
                : '';
        const description = subType + (data.description || '');

        const event = this.eventRepo.create({
            ...data,
            description,
            type: CalendarEventType.MINISTRY,
            ownerId: ministryId,
            organizer: { id: personId } as Person,
        });

        return this.eventRepo.save(event);
    }
}
