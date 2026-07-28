import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NeedEngagement } from '../entities/need-engagement.entity';
import { NeedSignal } from '../entities/need-signal.entity';
import {
  NeedEngagementStatus,
  NeedEntityType,
} from '../enums/need-signals.enum';
import { NeedEngagementContactDetailsDto } from '../dto/need-engagement-contact-details.dto';

@Injectable()
export class GetNeedEngagementContactDetailsUseCase {
  constructor(
    @InjectRepository(NeedEngagement)
    private readonly needEngagementRepository: Repository<NeedEngagement>,
    @InjectRepository(NeedSignal)
    private readonly needSignalRepository: Repository<NeedSignal>,
  ) {}

  async execute(
    requesterPersonId: string,
    engagementId: string,
  ): Promise<NeedEngagementContactDetailsDto> {
    const engagement = await this.needEngagementRepository.findOne({
      where: { id: engagementId, entityType: NeedEntityType.PERSONAL_NEED },
    });

    if (!engagement) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    const signal = await this.needSignalRepository.findOne({
      where: { id: engagement.entityId },
    });

    if (!signal) {
      throw new NotFoundException('Need Signal no encontrada');
    }

    const isOwner = signal.personId === requesterPersonId;
    const isAcceptedRequester =
      engagement.personId === requesterPersonId &&
      engagement.status === NeedEngagementStatus.ACCEPTED;

    if (!isOwner && !isAcceptedRequester) {
      throw new ForbiddenException(
        'No tienes permiso para ver los datos de contacto',
      );
    }

    return NeedEngagementContactDetailsDto.fromSignal(signal);
  }
}
