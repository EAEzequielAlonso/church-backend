import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Course } from '../entities/course.entity';
import { CourseParticipant } from '../entities/course-participant.entity';
import { ChurchMember } from '../../members/entities/church-member.entity';
import { CalendarEvent } from '../../agenda/entities/calendar-event.entity';
import { CoursePolicy } from '../policies/course.policy';
import { FamiliesService } from '../../families/families.service';
import { CourseRole } from '../../common/enums';

@Injectable()
export class EnrollParticipantUseCase {
    constructor(
        private readonly dataSource: DataSource,
        private readonly policy: CoursePolicy,
        private readonly familiesService: FamiliesService
    ) { }

    async execute(courseId: string, memberIds: string[], askingMemberId?: string, role: CourseRole = CourseRole.ATTENDEE) {
        // Validation: Family check if askingMemberId is present
        if (askingMemberId) {
            const isSelfOnly = memberIds.length === 1 && memberIds[0] === askingMemberId;
            if (!isSelfOnly) {
                const family = await this.familiesService.findByMember(askingMemberId);
                if (!family) throw new ForbiddenException('No tienes familia registrada para inscribir a otros.');
                const familyMemberIds = family.members.map(fm => fm.member.id);
                if (!memberIds.every(id => familyMemberIds.includes(id))) {
                    throw new ForbiddenException('Solo puedes inscribir a miembros de tu familia.');
                }
            }
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        const results = [];

        try {
            const course = await queryRunner.manager.findOne(Course, {
                where: { id: courseId },
                relations: ['sessions', 'sessions.event', 'participants', 'participants.member']
            });
            if (!course) throw new NotFoundException('Curso no encontrado');

            for (const memberId of memberIds) {
                try {
                    // Policy Checks
                    const currentCount = (course.participants?.length || 0); // Note: this count doesn't increment in loop, strictly it should.
                    // But we can approximate or re-count.
                    // Better: check duplicates first.

                    if (course.participants.some(p => p.member.id === memberId)) {
                        results.push({ memberId, status: 'already_joined' });
                        continue;
                    }

                    this.policy.ensureCapacityAvailable(course, currentCount);

                    const member = await queryRunner.manager.findOne(ChurchMember, {
                        where: { id: memberId },
                        relations: ['person']
                    });
                    if (!member) throw new NotFoundException('Miembro no encontrado');

                    // Save Participant
                    const participant = queryRunner.manager.create(CourseParticipant, {
                        course,
                        member,
                        role: role,
                        enrolledAt: new Date()
                    });
                    await queryRunner.manager.save(participant);

                    // Sync Calendar
                    // Add this person to ALL future session events
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    if (course.sessions) {
                        const futureSessions = course.sessions.filter(s => new Date(s.date) >= today);
                        for (const session of futureSessions) {
                            if (session.event) {
                                // We need to load attendees to append.
                                // It wasn't fully loaded in course findOne.
                                const event = await queryRunner.manager.findOne(CalendarEvent, {
                                    where: { id: session.event.id },
                                    relations: ['attendees']
                                });

                                if (event) {
                                    if (!event.attendees) event.attendees = [];
                                    if (!event.attendees.find(p => p.id === member.person.id)) {
                                        event.attendees.push(member.person);
                                        await queryRunner.manager.save(event);
                                    }
                                }
                            }
                        }
                    }

                    // Update local list for next iteration capacity check
                    course.participants.push(participant);

                    results.push({ memberId, status: 'joined' });

                } catch (error) {
                    results.push({ memberId, status: 'error', error: error.message });
                }
            }

            await queryRunner.commitTransaction();
            return results;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}
