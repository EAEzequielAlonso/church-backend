import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { AppPermission } from '../../../auth/authorization/permissions.enum';
import { MENTORSHIP_REPOSITORY_TOKEN } from '../../domain/constants/injection-tokens';
import { IMentorshipProcessRepository } from '../../domain/repositories/mentorship-process.repository.interface';
import { GetMentorshipsDto } from '../dto/get-mentorships.dto';
import { MentorshipResponseDto } from '../dto/mentorship-response.dto';

@Injectable()
export class GetMentorshipsUseCase {
  constructor(
    @Inject(MENTORSHIP_REPOSITORY_TOKEN)
    private readonly mentorshipRepository: IMentorshipProcessRepository,
  ) {}

  async execute(
    churchId: string,
    query: GetMentorshipsDto,
    userChurchPersonId?: string,
    userPermissions?: any[], // AppPermission
  ): Promise<{ data: MentorshipResponseDto[]; total: number }> {
    // Enforce security
    const hasGlobalView = userPermissions?.includes(
      AppPermission.COUNSELING_VIEW_ALL,
    );
    const requireParticipantMatch = !hasGlobalView;

    if (requireParticipantMatch && !userChurchPersonId) {
      throw new ForbiddenException(
        'Aperson ID is required if global permission is missing.',
      );
    }

    const { data, total } = await this.mentorshipRepository.findAll({
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
