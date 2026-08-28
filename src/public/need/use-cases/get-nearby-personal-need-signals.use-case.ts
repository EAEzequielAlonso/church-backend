import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NeedSignal } from '../entities/need-signal.entity';
import { NeedSignalStatus } from 'src/public/enums/public.enums';
import { MapFilterUtil } from 'src/shared/utils/map-filter.util';
import { NearbyPersonalNeedSignalDto } from '../dto/nearby-personal-need-signal.dto';

@Injectable()
export class GetNearbyPersonalNeedSignalsUseCase {
  constructor(
    @InjectRepository(NeedSignal)
    private readonly needSignalRepository: Repository<NeedSignal>,
  ) {}

  async execute(
    lat: number,
    lng: number,
    limit: number = 5,
    personId?: string,
  ): Promise<NearbyPersonalNeedSignalDto[]> {
    const qb = this.needSignalRepository
      .createQueryBuilder('signal')
      .innerJoinAndSelect('signal.needLocation', 'location')
      .leftJoinAndSelect('signal.person', 'person')
      .where('signal.status = :status', { status: NeedSignalStatus.OPEN });

    if (personId) {
      qb.andWhere('signal.personId != :personId', { personId });
    }

    MapFilterUtil.applyProximitySort(qb, lat, lng, 'location.latitude', 'location.longitude');
    
    qb.limit(limit);

    const { entities, raw } = await qb.getRawAndEntities();

    return entities.map((signal, index) => {
      // Aprox distance formula: 1 degree approx 111 km. 
      // The distance_sq is in degrees squared. We take sqrt to get degrees, then * 111 to get km.
      const rawDistanceSq = raw[index].distance_sq;
      let distanceLabel = '';
      if (rawDistanceSq !== undefined) {
        const distKm = Math.sqrt(Number(rawDistanceSq)) * 111;
        if (distKm < 1) {
          distanceLabel = 'A menos de 1 km';
        } else {
          distanceLabel = `A ${Math.round(distKm)} km`;
        }
      }
      return NearbyPersonalNeedSignalDto.fromEntityWithProximity(signal, distanceLabel);
    });
  }
}
