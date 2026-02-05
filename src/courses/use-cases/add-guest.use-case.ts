import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Course } from '../entities/course.entity';
import { CourseGuest } from '../entities/course-guest.entity';
import { CalendarEvent } from '../../agenda/entities/calendar-event.entity';
import { CoursePolicy } from '../policies/course.policy';
import { PeopleFunnelService } from '../people-funnel.service';
import { ContactsService } from '../../contacts/contacts.service';
import { AddGuestDto } from '../dto/create-course.dto';
import { FollowUpPerson } from '../../follow-ups/entities/follow-up-person.entity';

@Injectable()
export class AddGuestUseCase {
    constructor(
        private readonly dataSource: DataSource,
        private readonly policy: CoursePolicy,
        private readonly peopleFunnelService: PeopleFunnelService,
        private readonly contactsService: ContactsService
    ) { }

    async execute(courseId: string, dto: AddGuestDto) {
        // 1. Prepare Person entities (Funnel) - Outside transaction for now (Service reuse)
        // Ideally refactor FunnelService to accept Transaction Manager
        let personInvited = null;
        let followUpPerson = null;

        if (dto.followUpPersonId) {
            followUpPerson = await this.dataSource.getRepository(FollowUpPerson).findOne({
                where: { id: dto.followUpPersonId },
                relations: ['personInvited']
            });
        }

        if (dto.personInvitedId) {
            personInvited = await this.peopleFunnelService.findInvited(dto.personInvitedId);
        } else if (followUpPerson && followUpPerson.personInvited) {
            personInvited = followUpPerson.personInvited;
        }

        if (!personInvited) {
            personInvited = await this.peopleFunnelService.findOrCreateInvited({
                firstName: dto.firstName || dto.fullName.split(' ')[0],
                lastName: dto.lastName || dto.fullName.split(' ').slice(1).join(' ') || '',
                email: dto.email,
                phone: dto.phone
            });

            // Ensure link
            if (followUpPerson && !followUpPerson.personInvited) {
                // We'll update this inside transaction or here.
                // Let's defer to transaction for safety if possible, or just save now.
                followUpPerson.personInvited = personInvited;
                await this.dataSource.getRepository(FollowUpPerson).save(followUpPerson);
            }
        }

        // Contact Logic (Legacy)
        let contact = null;
        // Moved inside transaction to use course.church.id

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const course = await queryRunner.manager.findOne(Course, {
                where: { id: courseId },
                relations: ['church', 'guests', 'participants', 'sessions', 'sessions.event']
            });
            if (!course) throw new NotFoundException('Curso no encontrado');

            // Policy Checks
            const currentCount = (course.participants?.length || 0) + (course.guests?.length || 0);
            this.policy.ensureCapacityAvailable(course, currentCount);

            if (dto.personInvitedId) this.policy.ensureNotGuestDuplicate(course, 'INVITED', dto.personInvitedId);
            if (dto.followUpPersonId) this.policy.ensureNotGuestDuplicate(course, 'VISITOR', dto.followUpPersonId);

            // Contact creation if needed (now we have churchId)
            if (dto.email) {
                contact = await this.contactsService.findByEmail(dto.email, course.church.id);

                if (!contact) {
                    // Create if note found
                    contact = await this.contactsService.create({
                        firstName: dto.firstName || dto.fullName.split(' ')[0],
                        lastName: dto.lastName || dto.fullName.split(' ').slice(1).join(' '),
                        email: dto.email,
                        phone: dto.phone,
                        notes: dto.notes,
                        source: `Course: ${course.title}`
                    }, course.church.id);
                }
            }

            // Create Guest
            const guest = queryRunner.manager.create(CourseGuest, {
                course,
                contact,
                fullName: dto.fullName,
                email: dto.email,
                phone: dto.phone,
                notes: dto.notes,
                followUpPerson: dto.followUpPersonId ? { id: dto.followUpPersonId } : null,
                personInvited: personInvited
            });

            const savedGuest = await queryRunner.manager.save(guest);

            // SYNC CALENDAR (Future Sessions)
            // Guest -> PersonInvited -> Shadow Person?
            // If Guest has `personInvited`, and `personInvited` has `person` (Shadow), add to event.
            // `personInvited` from Funnel might not have Shadow Person created yet if they are just Invited.
            // `AgendaService` creates valid Persons on attendance.
            // But if we want them in the event "Attendees" list NOW, we need a Person.
            // If they don't have a Person entity, we can't add them to CalendarEvent.attendees (ManyToMany Person).
            // So Guests without Shadow Person won't appear in "Attendees" list on Calendar event,
            // BUT they appear in Course Participant list.
            // Attendance taking usually creates the Shadow Person.
            // So we skip adding to CalendarEvent if no Person entity exists.

            await queryRunner.commitTransaction();
            return savedGuest;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}
