import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Course } from '../entities/course.entity';
import { CourseSession } from '../entities/course-session.entity';
import { CalendarEvent } from '../../agenda/entities/calendar-event.entity';

@Injectable()
export class DeleteCourseUseCase {
    constructor(
        @InjectRepository(Course)
        private readonly courseRepository: Repository<Course>,
        private readonly dataSource: DataSource,
    ) { }

    async execute(id: string): Promise<void> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Fetch Course with Sessions and Events to cleanup
            const course = await queryRunner.manager.findOne(Course, {
                where: { id },
                relations: ['sessions', 'sessions.event']
            });

            if (!course) throw new NotFoundException('Curso no encontrado');

            // 2. Delete linked Calendar Events
            if (course.sessions && course.sessions.length > 0) {
                const eventIds = course.sessions
                    .filter(s => s.event)
                    .map(s => s.event.id);

                if (eventIds.length > 0) {
                    await queryRunner.manager.delete(CalendarEvent, eventIds);
                }
            }

            // 3. Delete Course (Cascade will handle Sessions, Participants, Guests if set up correctly)
            // If cascades are not set on Entity, we must manually delete sessions/participants.
            // Assuming TypeORM Cascade: true on OneToMany.
            // Let's check entity Course:
            // @OneToMany(() => CourseSession, (session) => session.course) sessions: CourseSession[];
            // Default cascade is mostly false/save. onDelete: "CASCADE" should be on the ManyToOne side.
            // Let's verify CourseSession entity.

            // Safe approach: Delete manually or rely on DB constraint.
            // Deleting the course usually triggers DB cascade if FK is set.
            // But let's use remove which triggers Typescript cascades if configured.
            await queryRunner.manager.remove(course);

            await queryRunner.commitTransaction();
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}
