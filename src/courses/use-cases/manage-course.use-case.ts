import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Course } from '../entities/course.entity';
import { ChurchMember } from '../../members/entities/church-member.entity';
import { CreateCourseDto, UpdateCourseDto } from '../dto/create-course.dto';
import { CoursePolicy } from '../policies/course.policy';
import { CourseStatus, ProgramType } from '../../common/enums';

@Injectable()
export class ManageCourseUseCase {
    constructor(
        @InjectRepository(Course)
        private readonly courseRepository: Repository<Course>,
        @InjectRepository(ChurchMember)
        private readonly memberRepository: Repository<ChurchMember>,
        private readonly policy: CoursePolicy,
        private readonly dataSource: DataSource,
    ) { }

    async create(dto: CreateCourseDto, creatorMemberId: string): Promise<Course> {
        const creator = await this.memberRepository.findOne({
            where: { id: creatorMemberId },
            relations: ['church']
        });
        if (!creator) throw new NotFoundException('Miembro creador no encontrado');
        if (!creator.church) throw new NotFoundException('Iglesia no encontrada');

        const parseDate = (dateStr: string) => {
            if (!dateStr) return undefined;
            const [y, m, d] = dateStr.split('-').map(Number);
            return new Date(y, m - 1, d, 12, 0, 0);
        };

        const course = this.courseRepository.create({
            title: dto.title,
            description: dto.description,
            category: dto.category,
            type: dto.type || ProgramType.COURSE,
            startDate: parseDate(dto.startDate),
            endDate: parseDate(dto.endDate),
            capacity: dto.capacity,
            color: dto.color,
            church: creator.church,
            createdBy: creator,
            status: CourseStatus.ACTIVE
        });

        return this.courseRepository.save(course);
    }

    async update(id: string, dto: UpdateCourseDto): Promise<Course> {
        const course = await this.courseRepository.findOne({ where: { id } });
        if (!course) throw new NotFoundException('Curso no encontrado');

        // Policy check if needed (e.g. can't edit finished course?)
        this.policy.ensureCourseIsActive(course);

        const parseDate = (dateStr: string) => {
            if (!dateStr) return undefined;
            const [y, m, d] = dateStr.split('-').map(Number);
            return new Date(y, m - 1, d, 12, 0, 0);
        };

        if (dto.title) course.title = dto.title;
        if (dto.description !== undefined) course.description = dto.description;
        if (dto.category) course.category = dto.category;
        if (dto.capacity !== undefined) course.capacity = dto.capacity;
        if (dto.color) course.color = dto.color;
        if (dto.status) course.status = dto.status;

        if (dto.startDate) course.startDate = parseDate(dto.startDate);
        if (dto.endDate !== undefined) course.endDate = dto.endDate ? parseDate(dto.endDate) : null;

        return this.courseRepository.save(course);
    }
}
