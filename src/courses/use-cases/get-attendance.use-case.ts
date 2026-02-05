import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionAttendance } from '../entities/session-attendance.entity';

@Injectable()
export class GetAttendanceUseCase {
    constructor(
        @InjectRepository(SessionAttendance)
        private readonly attendanceRepository: Repository<SessionAttendance>
    ) { }

    async execute(sessionId: string) {
        return this.attendanceRepository.find({
            where: { session: { id: sessionId } },
            relations: ['participant', 'participant.member', 'participant.member.person', 'guest']
        });
    }
}
