import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NeedSignal } from '../entities/need-signal.entity';

@Injectable()
export class GetActivePersonalNeedSignalUseCase {
  constructor(
    @InjectRepository(NeedSignal)
    private readonly needSignalRepository: Repository<NeedSignal>,
  ) {}

  async execute(personId: string): Promise<NeedSignal | null> {
    const signal = await this.needSignalRepository.findOne({
      where: { personId },
      relations: ['needLocation'],
      order: { createdAt: 'DESC' },
    });

    return signal || null;
  }
}
