import { MentorshipProcess } from '../../infrastructure/entities/mentorship-process.entity';
import { MentorshipMeeting } from '../../infrastructure/entities/mentorship-meeting.entity';
import { IMentorshipProcessRepository } from '../../domain/repositories/mentorship-process.repository.interface';
import {
  MENTORSHIP_REPOSITORY_TOKEN,
  DOMAIN_EVENT_BUS_TOKEN,
} from '../../domain/constants/injection-tokens';
import { DomainEventBus } from '../../domain/events/domain-event-bus.interface';
import { AddMeetingDto } from '../dto/mentorship-content.dto';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class AddMeetingUseCase {
  constructor(
    @Inject(MENTORSHIP_REPOSITORY_TOKEN)
    private readonly mentorshipRepository: IMentorshipProcessRepository,
    @Inject(DOMAIN_EVENT_BUS_TOKEN)
    private readonly eventBus: DomainEventBus,
  ) {}

  async execute(dto: AddMeetingDto): Promise<MentorshipProcess> {
    // 1. Encontrar el Agregado Raíz
    const process = await this.mentorshipRepository.findById(dto.processId);

    if (!process) {
      throw new Error(
        `El proceso de mentoría con ID ${dto.processId} no existe.`,
      );
    }

    // 2. Instanciar el encuentro
    const meeting = new MentorshipMeeting();
    meeting.title = dto.title;
    meeting.description = dto.description;
    meeting.color = dto.color;
    meeting.scheduledDate = dto.scheduledDate;
    meeting.endDate = dto.endDate;
    meeting.location = dto.location;

    // 3. Delegar validación y adjunción al Agregado
    // MentorshipProcess.addMeeting verificará mediante assertActive()
    // que el proceso NO esté PAUSED ni CLOSED.
    process.addMeeting(meeting);

    // 4. Persistir cambios
    await this.mentorshipRepository.save(process);
    await this.eventBus.publishAll(process.pullDomainEvents());

    return process;
  }
}
