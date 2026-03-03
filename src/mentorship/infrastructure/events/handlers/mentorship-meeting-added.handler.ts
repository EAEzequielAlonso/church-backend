import { Injectable, Logger, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { MentorshipMeetingAddedEvent } from '../../../domain/events/mentorship-events';
import { CalendarEvent } from '../../../../agenda/entities/calendar-event.entity';
import { ChurchPerson } from '../../../../members/entities/church-person.entity';
import { Person } from '../../../../users/entities/person.entity';
import { CalendarEventType } from '../../../../common/enums';
import { IMentorshipProcessRepository } from '../../../domain/repositories/mentorship-process.repository.interface';
import { MENTORSHIP_REPOSITORY_TOKEN } from '../../../domain/constants/injection-tokens';

@Injectable()
export class MentorshipMeetingAddedHandler {
  private readonly logger = new Logger(MentorshipMeetingAddedHandler.name);

  constructor(
    @InjectRepository(CalendarEvent)
    private readonly calendarEventRepository: Repository<CalendarEvent>,
    @InjectRepository(ChurchPerson)
    private readonly churchPersonRepository: Repository<ChurchPerson>,
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @Inject(MENTORSHIP_REPOSITORY_TOKEN)
    private readonly mentorshipRepository: IMentorshipProcessRepository,
  ) {}

  @OnEvent('MentorshipMeetingAddedEvent')
  async handleMentorshipMeetingAddedEvent(event: MentorshipMeetingAddedEvent) {
    this.logger.log(
      `[DOMAIN EVENT DETECTED]: MentorshipMeetingAddedEvent - Process: ${event.processId}`,
    );

    try {
      const process = await this.mentorshipRepository.findById(event.processId);

      if (!process) {
        this.logger.warn(
          `Mentorship process ${event.processId} not found. Cannot create calendar event.`,
        );
        return;
      }

      if (!event.scheduledDate) {
        return; // No date to schedule
      }

      const scheduledDate = new Date(event.scheduledDate);
      const endDate = event.endDate
        ? new Date(event.endDate)
        : new Date(scheduledDate.getTime() + 60 * 60 * 1000);

      const title =
        event.title ||
        `Encuentro de ${process.type === 'COUNSELING' ? 'Consejería' : process.type === 'DISCIPLESHIP' ? 'Discipulado' : 'Seguimiento'}`;
      const description =
        event.description ||
        `Proceso: ${process.motive || 'Sin motivo especificado'}`;
      const color = event.color || '#10b981';
      const location = event.location || undefined;

      // We need to map participants (ChurchPerson IDs) to CalendarEvent attendees (Person IDs)
      const churchPersonIds = process.participants.map((p) => p.churchPersonId);
      let attendees: Person[] = [];
      let organizer: Person | null = null;

      if (churchPersonIds.length > 0) {
        const churchPersons = await this.churchPersonRepository.find({
          where: { id: In(churchPersonIds) },
          relations: ['person'],
        });

        // Map to unique Person entities
        const personMap = new Map<string, Person>();
        churchPersons.forEach((cp) => {
          if (cp.person) {
            personMap.set(cp.person.id, cp.person);
          }
        });
        attendees = Array.from(personMap.values());
      }

      // Set the first Mentor as the organizer
      const mentorParticipant = process.participants.find(
        (p) => p.role === 'MENTOR',
      );
      if (mentorParticipant) {
        const mentorChurchPerson = await this.churchPersonRepository.findOne({
          where: { id: mentorParticipant.churchPersonId },
          relations: ['person'],
        });
        if (mentorChurchPerson && mentorChurchPerson.person) {
          organizer = mentorChurchPerson.person;
        }
      }

      const calendarEvent = this.calendarEventRepository.create({
        title,
        description,
        startDate: scheduledDate,
        endDate: endDate,
        location: location,
        type: CalendarEventType.PERSONAL,
        ownerId: organizer
          ? organizer.id
          : attendees.length > 0
            ? attendees[0].id
            : null,
        isAllDay: false,
        color: color,
        attendees,
        organizer: organizer
          ? organizer
          : attendees.length > 0
            ? attendees[0]
            : null,
      });

      await this.calendarEventRepository.save(calendarEvent);
      this.logger.log(
        `CalendarEvent created for MentorshipMeeting ${event.meetingId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing MentorshipMeetingAddedEvent: ${(error as any).message}`,
        (error as any).stack,
      );
    }
  }
}
