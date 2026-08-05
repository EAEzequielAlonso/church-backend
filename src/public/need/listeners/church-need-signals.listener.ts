import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChurchNeedSignal } from '../entities/church-need-signal.entity';
import { NeedSignalStatus } from 'src/public/enums/public.enums';

@Injectable()
export class ChurchNeedSignalsListener {
  private readonly logger = new Logger(ChurchNeedSignalsListener.name);

  constructor(
    @InjectRepository(ChurchNeedSignal)
    private readonly churchNeedSignalRepo: Repository<ChurchNeedSignal>,
  ) {}

  @OnEvent('church.need.signal.resolved')
  async handleChurchNeedSignalResolved(payload: {
    needSignalId: string;
    resultingChurchId: string;
    missionId: string;
  }) {
    this.logger.log(`Resolving ChurchNeedSignal ${payload.needSignalId} due to mission ${payload.missionId} completion`);
    
    try {
      await this.churchNeedSignalRepo.update(
        { id: payload.needSignalId },
        { status: NeedSignalStatus.CLOSED },
      );
    } catch (error) {
      this.logger.error(`Error resolving ChurchNeedSignal ${payload.needSignalId}`, error.stack);
    }
  }
}
