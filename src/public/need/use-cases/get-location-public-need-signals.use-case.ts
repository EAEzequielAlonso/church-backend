import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { NeedSignal } from '../entities/need-signal.entity';
import { NeedLocation } from '../entities/need-location.entity';
import { NeedSignalStatus } from '../../enums/public.enums';
import { PublicPersonalNeedSignalDto } from '../dto/public-personal-need-signal.dto';

@Injectable()
export class GetLocationPublicNeedSignalsUseCase {
  constructor(
    @InjectRepository(NeedSignal)
    private readonly needSignalRepository: Repository<NeedSignal>,
    @InjectRepository(NeedLocation)
    private readonly needLocationRepository: Repository<NeedLocation>,
  ) {}

  async execute(
    locationId: string,
    personId?: string,
  ): Promise<PublicPersonalNeedSignalDto[]> {
    const location = await this.needLocationRepository.findOne({
      where: { id: locationId },
    });
    if (!location) {
      throw new NotFoundException('Localidad no encontrada');
    }

    const whereClause: any = {
      needLocationId: locationId,
      status: NeedSignalStatus.OPEN,
    };

    if (personId) {
      whereClause.personId = Not(personId);
    }

    const signals = await this.needSignalRepository.find({
      where: whereClause,
      relations: ['person'],
      order: { createdAt: 'DESC' },
    });

    return signals.map((signal) =>
      PublicPersonalNeedSignalDto.fromEntity(signal),
    );
  }
}
