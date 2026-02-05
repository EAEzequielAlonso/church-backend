import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionAttendance } from '../entities/session-attendance.entity';
import { CourseSession } from '../entities/course-session.entity';

@Injectable()
export class RegisterAttendanceUseCase {
    constructor(
        @InjectRepository(SessionAttendance)
        private readonly attendanceRepository: Repository<SessionAttendance>,
        @InjectRepository(CourseSession)
        private readonly sessionRepository: Repository<CourseSession>
    ) { }

    async execute(sessionId: string, items: { participantId?: string, guestId?: string, present: boolean, notes?: string }[]) {
        const session = await this.sessionRepository.findOne({ where: { id: sessionId } });
        if (!session) throw new NotFoundException('Sesión no encontrada');

        const promises = items.map(async (item) => {
            let record = null;
            if (item.participantId) {
                record = await this.attendanceRepository.findOne({ where: { session: { id: sessionId }, participant: { id: item.participantId } } });
            } else if (item.guestId) {
                record = await this.attendanceRepository.findOne({ where: { session: { id: sessionId }, guest: { id: item.guestId } } });
            }

            if (!record) {
                record = this.attendanceRepository.create({
                    session,
                    participant: item.participantId ? { id: item.participantId } : null,
                    guest: item.guestId ? { id: item.guestId } : null
                });
            }

            record.present = item.present;
            record.notes = item.notes;
            return this.attendanceRepository.save(record);
        });

        return Promise.all(promises);
    }
}
