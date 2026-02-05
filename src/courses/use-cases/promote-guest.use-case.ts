import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { CourseGuest } from '../entities/course-guest.entity';
import { PeopleFunnelService } from '../people-funnel.service';

@Injectable()
export class PromoteGuestUseCase {
    constructor(
        @InjectRepository(CourseGuest)
        private readonly guestRepository: Repository<CourseGuest>,
        private readonly peopleFunnelService: PeopleFunnelService
    ) { }

    async toVisitor(guestId: string, promotedByMemberId: string) {
        const guest = await this.guestRepository.findOne({
            where: { id: guestId },
            relations: ['course', 'course.church', 'followUpPerson', 'personInvited']
        });

        if (!guest) throw new NotFoundException('Invitado no encontrado');
        if (guest.followUpPerson) throw new BadRequestException('Este invitado ya está en seguimiento.');

        let personInvited = guest.personInvited;
        if (!personInvited) {
            personInvited = await this.peopleFunnelService.findOrCreateInvited({
                firstName: guest.fullName.split(' ')[0],
                lastName: guest.fullName.split(' ').slice(1).join(' ') || '',
                email: guest.email,
                phone: guest.phone
            });
            guest.personInvited = personInvited;
            await this.guestRepository.save(guest);
        }

        const visitor = await this.peopleFunnelService.promoteToFollowUp(
            personInvited.id,
            guest.course.church.id,
            promotedByMemberId
        );

        // Update ALL guests linked to this PersonInvited (Retroactive link)
        await this.guestRepository.update(
            { personInvited: { id: personInvited.id } },
            { followUpPerson: visitor }
        );

        // Update legacy email matches
        const conditions = [];
        if (guest.email) conditions.push({ email: guest.email, personInvited: IsNull() });
        if (guest.phone) conditions.push({ phone: guest.phone, personInvited: IsNull() });

        if (conditions.length > 0) {
            const others = await this.guestRepository.find({ where: conditions });
            for (const other of others) {
                other.personInvited = personInvited;
                other.followUpPerson = visitor;
            }
            if (others.length > 0) await this.guestRepository.save(others);
        }

        return visitor;
    }

    async toMember(guestId: string) {
        const guest = await this.guestRepository.findOne({
            where: { id: guestId },
            relations: ['course', 'course.church', 'personInvited']
        });
        if (!guest) throw new NotFoundException('Invitado no encontrado');

        let personInvited = guest.personInvited;
        if (!personInvited) {
            personInvited = await this.peopleFunnelService.findOrCreateInvited({
                firstName: guest.fullName.split(' ')[0],
                lastName: guest.fullName.split(' ').slice(1).join(' ') || '',
                email: guest.email,
                phone: guest.phone
            });
            guest.personInvited = personInvited;
            await this.guestRepository.save(guest);
        }

        const member = await this.peopleFunnelService.promoteToMember(personInvited.id, guest.course.church.id);

        guest.convertedToMember = member;
        await this.guestRepository.save(guest);

        return member;
    }
}
