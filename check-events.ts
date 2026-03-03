import { DataSource } from 'typeorm';
import { CalendarEvent } from './src/agenda/entities/calendar-event.entity';
import * as dotenv from 'dotenv';
dotenv.config();

const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'iglesia_db',
    entities: [CalendarEvent],
});

async function run() {
    await dataSource.initialize();
    const repo = dataSource.getRepository(CalendarEvent);
    const events = await repo.find({ where: { type: 'MINISTRY' as any } });
    console.log(events);
    await dataSource.destroy();
}

run().catch(console.error);
