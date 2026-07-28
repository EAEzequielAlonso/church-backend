import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NeedSignal } from '../entities/need-signal.entity';
import { NeedInformation } from '../entities/need-information.entity';
import { AddNeedInformationDto } from '../dto/church-need-signals/add-need-information.dto';
import { EcosystemContributionsService } from '../../ecosystem/services/ecosystem-contributions.service';
import { EcosystemContributionType } from '../../ecosystem/enums/ecosystem.enums';
import { NeedInformationEntityType } from '../enums/need-signals.enum';

@Injectable()
export class AddNeedSignalInformationUseCase {
  constructor(
    @InjectRepository(NeedSignal)
    private readonly needSignalRepository: Repository<NeedSignal>,
    @InjectRepository(NeedInformation)
    private readonly needInformationRepository: Repository<NeedInformation>,
    private readonly ecosystemContributionsService: EcosystemContributionsService,
  ) {}

  async execute(
    personId: string,
    signalId: string,
    dto: AddNeedInformationDto,
  ): Promise<NeedInformation> {
    const signal = await this.needSignalRepository.findOne({
      where: { id: signalId },
      relations: ['needLocation'],
    });

    if (!signal) {
      throw new NotFoundException('Need Signal no encontrado');
    }

    const info = this.needInformationRepository.create({
      personId,
      entityType: NeedInformationEntityType.NEED_SIGNAL,
      entityId: signalId,
      category: dto.category,
      title: dto.title,
      content: dto.content,
      attachments: dto.attachments,
    });

    const savedInfo = await this.needInformationRepository.save(info);

    await this.ecosystemContributionsService.recordContribution({
      actorPersonId: personId,
      targetChurchId: null,
      type: EcosystemContributionType.NEED_INFORMATION_ADDED,
      metadata: {
        signalId,
        infoId: savedInfo.id,
        geoCity: signal.needLocation?.city,
        geoState: signal.needLocation?.state,
        geoCountry: signal.needLocation?.country,
      },
    });

    return savedInfo;
  }
}
