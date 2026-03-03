import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { AppPermission } from '../../../auth/authorization/permissions.enum';
import { MENTORSHIP_REPOSITORY_TOKEN } from '../../domain/constants/injection-tokens';
import { IMentorshipProcessRepository } from '../../domain/repositories/mentorship-process.repository.interface';
import { MentorshipResponseDto } from '../dto/mentorship-response.dto';

@Injectable()
export class GetMentorshipByIdUseCase {
  constructor(
    @Inject(MENTORSHIP_REPOSITORY_TOKEN)
    private readonly mentorshipRepository: IMentorshipProcessRepository,
  ) {}

  async execute(
    churchId: string,
    id: string,
    userChurchPersonId?: string,
    userPermissions?: any[],
  ): Promise<MentorshipResponseDto> {
    const process = await this.mentorshipRepository.findById(id);

    if (!process || process.churchId !== churchId) {
      throw new NotFoundException(
        `Mentorship Process with ID ${id} not found in this church.`,
      );
    }

    // Enforce security
    const hasGlobalView = userPermissions?.includes(
      AppPermission.COUNSELING_VIEW_ALL,
    );

    if (!hasGlobalView) {
      if (!userChurchPersonId) {
        throw new ForbiddenException(
          'Access denied. No global view permission or person context given.',
        );
      }
      const isParticipant = process.participants?.some(
        (p) => p.churchPersonId === userChurchPersonId,
      );
      if (!isParticipant) {
        throw new ForbiddenException(
          'Access denied. You are not a participant in this process.',
        );
      }
    }

    return MentorshipResponseDto.fromEntity(process, {
      userChurchPersonId,
      userPermissions,
    });
  }
}
