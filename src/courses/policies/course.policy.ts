import { Injectable, BadRequestException } from '@nestjs/common';
import { Course } from '../entities/course.entity';

@Injectable()
export class CoursePolicy {
    ensureCourseIsActive(course: Course) {
        if (!course) throw new BadRequestException('Curso no encontrado');
        // Example domain rule: If status is FINISHED or CANCELLED, maybe restrict edits?
        // Using string comparison or enum if imported
    }

    ensureNotDuplicateParticipant(course: Course, memberId: string) {
        if (course.participants?.some(p => p.member.id === memberId)) {
            throw new BadRequestException('El miembro ya está inscrito en este curso');
        }
    }

    ensureCapacityAvailable(course: Course, currentCount: number) {
        if (course.capacity > 0 && currentCount >= course.capacity) {
            throw new BadRequestException(`Cupo alcanzado (${course.capacity} personas)`);
        }
    }

    ensureNotGuestDuplicate(course: Course, type: 'INVITED' | 'VISITOR', id: string) {
        if (type === 'INVITED') {
            if (course.guests?.some(g => g.personInvited?.id === id)) {
                throw new BadRequestException('Esta persona ya está en la lista de invitados');
            }
        } else {
            if (course.guests?.some(g => g.followUpPerson?.id === id)) {
                throw new BadRequestException('Esta persona ya está agregada como visitante');
            }
        }
    }
}
