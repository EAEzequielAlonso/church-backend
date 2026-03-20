import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AppPermission } from '../../auth/authorization/permissions.enum';
import { MentorshipResponseDto } from '../dto/mentorship-response.dto';
import { MentorshipService } from '../services/mentorship.service';

@Injectable()
export class GetMentorshipByIdUseCase {
  constructor(private readonly mentorshipService: MentorshipService) {}

  async execute(
    churchId: string,
    id: string,
    userChurchPersonId?: string,
    userPermissions?: any[],
  ): Promise<MentorshipResponseDto> {
    const process = await this.mentorshipService.findById(id);

    if (!process || process.churchId !== churchId) {
      throw new NotFoundException(
        `Mentorship Process with ID ${id} not found in this church.`,
      );
    }

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
