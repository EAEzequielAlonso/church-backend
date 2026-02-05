import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CourseParticipant } from '../entities/course-participant.entity';
import { CalendarEvent } from '../../agenda/entities/calendar-event.entity';

@Injectable()
export class RemoveParticipantUseCase {
    constructor(private readonly dataSource: DataSource) { }

    async execute(participantId: string) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const participant = await queryRunner.manager.findOne(CourseParticipant, {
                where: { id: participantId },
                relations: ['member', 'member.person', 'course', 'course.sessions', 'course.sessions.event', 'course.sessions.event.attendees']
            });

            if (!participant) return { deleted: false }; // Idempotent or throw? Original service returned { deleted: false }

            // Sync Calendar
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (participant.course && participant.course.sessions) {
                const futureSessions = participant.course.sessions.filter(s => new Date(s.date) >= today);
                const personId = participant.member.person.id;

                for (const session of futureSessions) {
                    if (session.event && session.event.attendees) {
                        const originalCount = session.event.attendees.length;
                        session.event.attendees = session.event.attendees.filter(p => p.id !== personId);

                        if (session.event.attendees.length !== originalCount) {
                            await queryRunner.manager.save(session.event);
                        }
                    }
                }
            }

            await queryRunner.manager.remove(participant);
            await queryRunner.commitTransaction();
            return { deleted: true };
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async executeForMember(courseId: string, memberId: string) {
        const participant = await this.dataSource.getRepository(CourseParticipant).findOne({
            where: { course: { id: courseId }, member: { id: memberId } }
        });

        if (!participant) {
            throw new NotFoundException('No estás inscrito en esta actividad');
        }

        return this.execute(participant.id);
    }
}
