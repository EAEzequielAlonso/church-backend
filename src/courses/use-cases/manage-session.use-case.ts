import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Course } from '../entities/course.entity';
import { CourseSession } from '../entities/course-session.entity';
import { CalendarEvent } from '../../agenda/entities/calendar-event.entity';
import { CreateSessionDto } from '../dto/create-course.dto';
import { CalendarEventType, ProgramType } from '../../common/enums';

@Injectable()
export class ManageSessionUseCase {
    constructor(private readonly dataSource: DataSource) { }

    async create(courseId: string, dto: CreateSessionDto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const course = await queryRunner.manager.findOne(Course, {
                where: { id: courseId },
                relations: ['church', 'participants', 'participants.member', 'participants.member.person']
            });
            if (!course) throw new NotFoundException('Curso no encontrado');

            // 1. Create Calendar Event
            const startDateTime = new Date(`${dto.date}T${dto.startTime}:00`);
            const endDateTime = new Date(startDateTime.getTime() + (dto.estimatedDuration || 60) * 60000);

            // Get current attendees (participants)
            // Note: In strict sync, we should probably fetch Guests too to add them if they have Shadow Persons?
            // Existing logic only added participants. We'll stick to that to preserve behavior, 
            // or improve it if "reuse smallgroups" validation implies it.
            // SmallGroups auto-adds members.
            const attendees = course.participants.map(p => p.member.person);

            const event = queryRunner.manager.create(CalendarEvent, {
                title: `${course.title} - ${dto.topic}`,
                description: dto.notes || `Sesión del curso: ${course.title}`,
                startDate: startDateTime,
                endDate: endDateTime,
                location: 'Iglesia',
                type: course.type === ProgramType.ACTIVITY ? CalendarEventType.ACTIVITY : CalendarEventType.COURSE,
                color: course.color,
                church: course.church,
                attendees: attendees
            });

            const savedEvent = await queryRunner.manager.save(event);

            // 2. Create Session
            const session = queryRunner.manager.create(CourseSession, {
                course,
                date: new Date(dto.date + 'T12:00:00'),
                startTime: dto.startTime,
                estimatedDuration: dto.estimatedDuration || 60,
                topic: dto.topic,
                notes: dto.notes,
                event: savedEvent
            });

            const savedSession = await queryRunner.manager.save(session);

            await queryRunner.commitTransaction();
            return savedSession;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async update(sessionId: string, dto: Partial<CreateSessionDto>) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const session = await queryRunner.manager.findOne(CourseSession, {
                where: { id: sessionId },
                relations: ['event', 'course']
            });
            if (!session) throw new NotFoundException('Sesión no encontrada');

            // Update Session
            if (dto.date) session.date = new Date(dto.date + 'T12:00:00');
            if (dto.startTime) session.startTime = dto.startTime;
            if (dto.topic) session.topic = dto.topic;
            if (dto.notes) session.notes = dto.notes;
            if (dto.estimatedDuration) session.estimatedDuration = dto.estimatedDuration;

            await queryRunner.manager.save(session);

            // Update Event
            if (session.event) {
                if (dto.topic) session.event.title = `${session.course.title} - ${dto.topic}`;
                if (dto.notes) session.event.description = dto.notes;

                const finalDate = dto.date || session.date.toISOString().split('T')[0];
                const finalTime = dto.startTime || session.startTime;

                if (finalDate && finalTime) {
                    const start = new Date(`${finalDate}T${finalTime}:00`);
                    if (!isNaN(start.getTime())) {
                        session.event.startDate = start;
                        const duration = dto.estimatedDuration || session.estimatedDuration || 60;
                        session.event.endDate = new Date(start.getTime() + duration * 60000);
                    }
                }
                await queryRunner.manager.save(session.event);
            }

            await queryRunner.commitTransaction();
            return session;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}
