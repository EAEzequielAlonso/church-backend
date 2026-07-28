import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NeedEngagement } from '../entities/need-engagement.entity';
import { NeedEntityType, NeedEngagementType } from '../enums/need-signals.enum';
import { NeedEngagementResponseDto } from '../dto/need-engagement-response.dto';

@Injectable()
export class ListSentContactRequestsUseCase {
  constructor(
    @InjectRepository(NeedEngagement)
    private readonly needEngagementRepository: Repository<NeedEngagement>,
  ) {}

  async execute(
    requesterPersonId: string,
  ): Promise<NeedEngagementResponseDto[]> {
    const engagements = await this.needEngagementRepository.find({
      where: {
        entityType: NeedEntityType.PERSONAL_NEED,
        type: NeedEngagementType.CONTACT,
        personId: requesterPersonId,
      },
      order: { createdAt: 'DESC' },
    });

    // In this case, we don't necessarily need to populate the target person
    // for privacy reasons, or we could just populate the signal.
    // The DTO will handle it safely.
    return engagements.map((engagement) =>
      NeedEngagementResponseDto.fromEntity(engagement),
    );
  }
}
