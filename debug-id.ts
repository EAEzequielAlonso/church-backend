
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';
import { CalendarEvent } from './src/agenda/entities/calendar-event.entity';
import { MinistryMeeting } from './src/ministries/entities/ministry-meeting.entity';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);

    const eventId = 'b454cea4-065b-49b8-86d1-bbeefea1cd87';
    console.log(`\n--- BUSCANDO EVENTO: ${eventId} ---`);

    const eventRepo = dataSource.getRepository(CalendarEvent);
    const meetingRepo = dataSource.getRepository(MinistryMeeting);

    const event = await eventRepo.findOne({ where: { id: eventId } });

    if (!event) {
        console.log('Evento NO encontrado en calendar_events');
    } else {
        console.log('Evento ENCONTRADO:');
        console.log(`  Title: ${event.title}`);
        console.log(`  Type: ${event.type}`);
        console.log(`  SourceType: ${event.sourceType}`);
        console.log(`  SourceId: ${event.sourceId}`);
        console.log(`  OwnerId: ${event.ownerId}`);

        if (event.sourceId) {
            const meetingDirect = await meetingRepo.findOne({ where: { id: event.sourceId } });
            console.log(`Buscando MinistryMeeting por ID nativo (${event.sourceId}): ${meetingDirect ? 'ENCONTRADO' : 'NO ENCONTRADO'}`);
        }

        const meetingByCalendarId = await meetingRepo.findOne({ where: { calendarEventId: event.id } });
        console.log(`Buscando MinistryMeeting por calendarEventId (${event.id}): ${meetingByCalendarId ? 'ENCONTRADO' : 'NO ENCONTRADO'}`);
    }

    await app.close();
}

bootstrap();
