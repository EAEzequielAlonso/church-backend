import { Injectable, ForbiddenException } from '@nestjs/common';
import { GetMentorshipsDto } from '../dto/get-mentorships.dto';
import { MentorshipResponseDto } from '../dto/mentorship-response.dto';
import { MentorshipService } from '../services/mentorship.service';
import { ParticipantStatus } from '../enums/mentorship.enum';

@Injectable()
export class GetInvitationsUseCase {
  constructor(private readonly mentorshipService: MentorshipService) {}

  async execute(
    churchId: string,
    query: GetMentorshipsDto,
    userChurchPersonId: string,
    userPermissions?: any[],
  ): Promise<{ data: MentorshipResponseDto[]; total: number }> {
    if (!userChurchPersonId) {
      throw new ForbiddenException('Se requiere el ID de la persona para ver las invitaciones.');
    }

    const { data, total } = await this.mentorshipService.findAll({
      churchId,
      page: query.page || 1,
      limit: query.limit || 10,
      requireParticipantMatch: true,
      userChurchPersonId,
      participantStatuses: [ParticipantStatus.PENDING],
    });

    const mappedData = data.map((process) =>
      MentorshipResponseDto.fromEntity(process, {
        userChurchPersonId,
        userPermissions,
      }),
    );

    return { data: mappedData, total };
  }
}
