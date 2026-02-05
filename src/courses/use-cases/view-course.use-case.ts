import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../entities/course.entity';
import { ChurchMember } from '../../members/entities/church-member.entity';
import { ProgramType, CourseStatus } from '../../common/enums';

@Injectable()
export class ViewCourseUseCase {
    constructor(
        @InjectRepository(Course)
        private readonly courseRepository: Repository<Course>,
        @InjectRepository(ChurchMember)
        private readonly memberRepository: Repository<ChurchMember>,
    ) { }

    async findAll(memberId: string, viewAll: boolean, type?: ProgramType): Promise<Course[]> {
        const member = await this.memberRepository.findOne({ where: { id: memberId }, relations: ['church'] });
        if (!member) throw new NotFoundException('Miembro no encontrado');

        const whereClause: any = { church: { id: member.church.id } };
        if (type) whereClause.type = type;

        if (viewAll) {
            // Admin/Pastor View: All courses
            return this.courseRepository.find({
                where: whereClause,
                relations: ['participants', 'participants.member', 'participants.member.person'],
                order: { startDate: 'DESC' }
            });
        } else {
            // General Member View:
            // 1. Activities: Show all ACTIVE (Public)
            // 2. Courses: Show only enrolled

            if (type === ProgramType.ACTIVITY) {
                return this.courseRepository.find({
                    where: { ...whereClause, status: CourseStatus.ACTIVE },
                    relations: ['participants', 'participants.member', 'participants.member.person'],
                    order: { startDate: 'DESC' }
                });
            }

            // Default/Course: Enrolled only
            return this.courseRepository.find({
                where: {
                    ...whereClause,
                    participants: { member: { id: memberId } }
                },
                relations: ['participants', 'participants.member', 'participants.member.person'],
                order: { startDate: 'DESC' }
            });
        }
    }

    async findOne(id: string): Promise<Course> {
        const course = await this.courseRepository.findOne({
            where: { id },
            relations: [
                'sessions',
                'sessions.event',
                'sessions.attendances', // Source of truth for course stats
                'sessions.attendances.participant',
                'sessions.attendances.guest',
                'participants',
                'participants.member',
                'participants.member.person',
                'guests',
                'guests.followUpPerson',
                'guests.followUpPerson.personInvited',
                'guests.followUpPerson.personInvited.person', // Deep relation for attendance matching
                'guests.personInvited',
                'guests.personInvited.person', // Deep relation for attendance matching
            ]
        });
        if (!course) throw new NotFoundException('Curso no encontrado');
        return course;
    }
}
