import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../entities/course.entity';
import { SessionAttendance } from '../entities/session-attendance.entity';

@Injectable()
export class GetCourseStatsUseCase {
    constructor(
        @InjectRepository(Course)
        private readonly courseRepository: Repository<Course>,
        @InjectRepository(SessionAttendance)
        private readonly attendanceRepository: Repository<SessionAttendance>
    ) { }

    async execute(courseId: string) {
        const course = await this.courseRepository.findOne({
            where: { id: courseId },
            relations: ['sessions', 'participants', 'guests', 'guests.followUpPerson']
        });
        if (!course) throw new NotFoundException('Curso no encontrado');

        const totalSessions = course.sessions.length;
        const pastSessions = course.sessions.filter(s => new Date(s.date) < new Date());

        let totalAttendancePercentage = 0;
        let sessionsWithAttendance = 0;

        for (const session of pastSessions) {
            const attendanceCount = await this.attendanceRepository.count({
                where: { session: { id: session.id }, present: true }
            });

            const expected = (course.participants?.length || 0) + (course.guests?.length || 0);

            if (expected > 0) {
                totalAttendancePercentage += (attendanceCount / expected) * 100;
                sessionsWithAttendance++;
            }
        }

        const averageAttendance = sessionsWithAttendance > 0 ? Math.round(totalAttendancePercentage / sessionsWithAttendance) : 0;
        const participantsCount = course.participants?.length || 0;
        const totalGuests = course.guests?.length || 0;
        const visitorsCount = course.guests?.filter(g => g.followUpPerson).length || 0;
        const unlinkedGuestsCount = totalGuests - visitorsCount;

        return {
            totalSessions,
            pastSessions: pastSessions.length,
            averageAttendance: `${averageAttendance}%`,
            studentsCount: participantsCount + totalGuests,
            visitorsCount,
            newGuestsCount: unlinkedGuestsCount,
            membersCount: participantsCount
        };
    }
}
