import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseGuest } from '../entities/course-guest.entity';

@Injectable()
export class RemoveGuestUseCase {
    constructor(
        @InjectRepository(CourseGuest)
        private readonly guestRepository: Repository<CourseGuest>
    ) { }

    async execute(guestId: string): Promise<void> {
        const guest = await this.guestRepository.findOne({ where: { id: guestId } });
        if (!guest) throw new NotFoundException('Invitado no encontrado');

        await this.guestRepository.remove(guest);
    }
}
