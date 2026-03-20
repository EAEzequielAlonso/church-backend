import { Injectable, ForbiddenException } from '@nestjs/common';
import { AppPermission } from '../../auth/authorization/permissions.enum';
import { GetMentorshipsDto } from '../dto/get-mentorships.dto';
import { MentorshipResponseDto } from '../dto/mentorship-response.dto';
import { MentorshipService } from '../services/mentorship.service';

@Injectable()
export class GetMentorshipsUseCase {
  constructor(private readonly mentorshipService: MentorshipService) {}

  async execute(
    churchId: string,
    query: GetMentorshipsDto,
    userChurchPersonId?: string,
    userPermissions?: any[],
  ): Promise<{ data: MentorshipResponseDto[]; total: number }> {
    const hasGlobalView = userPermissions?.includes(
      AppPermission.COUNSELING_VIEW_ALL,
    );
    const requireParticipantMatch = !hasGlobalView;

    if (requireParticipantMatch && !userChurchPersonId) {
      throw new ForbiddenException(
        'A person ID is required if global permission is missing.',
      );
    }

    const { data, total } = await this.mentorshipService.findAll({
      churchId,
      page: query.page || 1,
      limit: query.limit || 10,
      type: query.type,
      status: query.status,
      requireParticipantMatch,
      userChurchPersonId,
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
