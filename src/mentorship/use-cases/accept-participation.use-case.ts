import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MentorshipProcessParticipant } from '../entities/mentorship-process-participant.entity';
import { MentorshipPolicy } from '../policies/mentorship.policy';
import { ParticipantStatus, MentorshipStatus } from '../enums/mentorship.enum';

@Injectable()
export class AcceptParticipationUseCase {
  constructor(
    @InjectRepository(MentorshipProcessParticipant)
    private readonly participantRepository: Repository<MentorshipProcessParticipant>,
    private readonly mentorshipPolicy: MentorshipPolicy,
  ) {}

  async execute(
    participantId: string,
    executorChurchPersonId: string | null | undefined,
    churchId: string,
    executorPersonId?: string | null,
  ) {
    const participant = await this.participantRepository.findOne({
      where: { id: participantId, process: { churchId } },
      relations: { process: true, churchPerson: true },
    });

    if (!participant) {
      throw new NotFoundException(`La invitación con ID ${participantId} no existe.`);
    }

    const isInvitedMembership = participant.churchPersonId === executorChurchPersonId;
    const isInvitedPerson =
      !!executorPersonId && participant.churchPerson?.personId === executorPersonId;

    if (!isInvitedMembership && !isInvitedPerson) {
      throw new ForbiddenException('Solo el usuario invitado puede aceptar esta participación.');
    }

    if (participant.process.status === MentorshipStatus.CLOSED) {
      throw new BadRequestException('No se puede aceptar una invitación de un proceso que ya está cerrado.');
    }

    if (participant.status !== ParticipantStatus.PENDING) {
      throw new BadRequestException('Esta invitación ya ha sido procesada.');
    }

    participant.status = ParticipantStatus.ACCEPTED;
    participant.joinedAt = new Date();

    return await this.participantRepository.save(participant);
  }
}
