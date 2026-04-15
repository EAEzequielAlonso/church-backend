import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MentorshipProcessParticipant } from '../entities/mentorship-process-participant.entity';
import { ParticipantStatus } from '../enums/mentorship.enum';

@Injectable()
export class DeclineParticipationUseCase {
  constructor(
    @InjectRepository(MentorshipProcessParticipant)
    private readonly participantRepository: Repository<MentorshipProcessParticipant>,
  ) {}

  async execute(
    participantId: string,
    executorChurchPersonId: string | null | undefined,
    churchId: string,
    executorPersonId?: string | null,
  ) {
    const participant = await this.participantRepository.findOne({
      where: { id: participantId, process: { churchId } },
      relations: { churchPerson: true },
    });

    if (!participant) {
      throw new NotFoundException(`La invitación con ID ${participantId} no existe.`);
    }

    const isInvitedMembership = participant.churchPersonId === executorChurchPersonId;
    const isInvitedPerson =
      !!executorPersonId && participant.churchPerson?.personId === executorPersonId;

    if (!isInvitedMembership && !isInvitedPerson) {
      throw new ForbiddenException('Solo el usuario invitado puede rechazar esta participación.');
    }

    if (participant.status !== ParticipantStatus.PENDING) {
      throw new BadRequestException('Esta invitación ya ha sido procesada.');
    }

    participant.status = ParticipantStatus.DECLINED;

    return await this.participantRepository.save(participant);
  }
}
