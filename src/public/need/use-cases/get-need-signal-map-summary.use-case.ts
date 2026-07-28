import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NeedSignal } from '../entities/need-signal.entity';

@Injectable()
export class GetNeedSignalMapSummaryUseCase {
  constructor(
    @InjectRepository(NeedSignal)
    private readonly needSignalRepository: Repository<NeedSignal>,
  ) {}

  async execute(id: string) {
    const signal = await this.needSignalRepository.findOne({
      where: { id },
      relations: ['needLocation'],
    });
    if (!signal) return null;
    return {
      id: signal.id,
      title: 'Señal de Necesidad',
      type: 'NEED_SIGNAL',
      description: signal.note?.slice(0, 150) ?? null,
      city: signal.needLocation?.city,
      state: signal.needLocation?.state,
      ctaLink: `/need-signals/${signal.id}`,
    };
  }
}
