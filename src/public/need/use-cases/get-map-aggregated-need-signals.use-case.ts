import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NeedSignal } from '../entities/need-signal.entity';
import { NeedSignalStatus } from 'src/public/enums/public.enums';
import { MapViewportDto } from 'src/shared/dtos/map-viewport.dto';
import { MapLayerResponseDto } from 'src/shared/dtos/map-layer-response.dto';
import { MapFilterUtil } from 'src/shared/utils/map-filter.util';
import { NeedSignalMapMarkerDto } from '../dto/need-signal-map-marker.dto';

@Injectable()
export class GetMapAggregatedNeedSignalsUseCase {
  constructor(
    @InjectRepository(NeedSignal)
    private readonly needSignalRepository: Repository<NeedSignal>,
  ) {}

  async execute(
    viewport: MapViewportDto,
  ): Promise<MapLayerResponseDto<NeedSignalMapMarkerDto>> {
    // Zoom limit: Personal signals are too many, don't show on continental zoom
    if (viewport.zoom !== undefined && viewport.zoom < 7) {
      return new MapLayerResponseDto([], false);
    }

    const qb = this.needSignalRepository
      .createQueryBuilder('signal')
      .innerJoinAndSelect('signal.needLocation', 'location')
      .where('signal.status = :status', { status: NeedSignalStatus.OPEN });

    MapFilterUtil.applyViewportFilter(
      qb,
      viewport,
      'location.latitude',
      'location.longitude',
    );

    return MapFilterUtil.getPaginatedMapResults(
      qb,
      200,
      (signal: NeedSignal) => {
        // Jittering logic: Add an offset of ~300m to avoid pinpointing exact houses
        // Also helps spread out markers if they share the exact same NeedLocation (city center)
        // 0.003 degrees is roughly 300 meters
        const randomOffsetLat = (Math.random() - 0.5) * 0.006;
        const randomOffsetLng = (Math.random() - 0.5) * 0.006;

        return new NeedSignalMapMarkerDto({
          id: signal.id,
          needLocationId: signal.needLocationId,
          latitude: Number(signal.needLocation.latitude) + randomOffsetLat,
          longitude: Number(signal.needLocation.longitude) + randomOffsetLng,
          status: signal.status,
        });
      },
    );
  }
}
