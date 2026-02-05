import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseGuest } from '../entities/course-guest.entity';
import { AddGuestDto } from '../dto/create-course.dto';

@Injectable()
export class UpdateGuestUseCase {
    constructor(
        @InjectRepository(CourseGuest)
        private readonly guestRepository: Repository<CourseGuest>
    ) { }

    async execute(guestId: string, dto: Partial<AddGuestDto>) {
        const guest = await this.guestRepository.findOne({ where: { id: guestId } });
        if (!guest) throw new NotFoundException('Invitado no encontrado');

        Object.assign(guest, dto);
        return this.guestRepository.save(guest);
    }
}
