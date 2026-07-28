import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NeedEngagement } from '../entities/need-engagement.entity';
import { NeedSignal } from '../entities/need-signal.entity';
import { NeedEntityType, NeedEngagementType } from '../enums/need-signals.enum';
import { NeedSignalStatus } from '../../enums/public.enums';
import { NeedEngagementResponseDto } from '../dto/need-engagement-response.dto';

@Injectable()
export class ListReceivedContactRequestsUseCase {
  constructor(
    @InjectRepository(NeedEngagement)
    private readonly needEngagementRepository: Repository<NeedEngagement>,
    @InjectRepository(NeedSignal)
    private readonly needSignalRepository: Repository<NeedSignal>,
  ) {}

  async execute(ownerPersonId: string): Promise<NeedEngagementResponseDto[]> {
    const activeSignal = await this.needSignalRepository.findOne({
      where: { personId: ownerPersonId, status: NeedSignalStatus.OPEN },
    });

    if (!activeSignal) {
      return [];
    }

    const engagements = await this.needEngagementRepository.find({
      where: {
        entityType: NeedEntityType.PERSONAL_NEED,
        entityId: activeSignal.id,
        type: NeedEngagementType.CONTACT,
      },
      relations: ['person'],
      order: { createdAt: 'DESC' },
    });

    return engagements.map((engagement) =>
      NeedEngagementResponseDto.fromEntity(engagement),
    );
  }
}
