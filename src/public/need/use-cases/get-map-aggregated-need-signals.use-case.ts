import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NeedLocation } from '../entities/need-location.entity';
import { NeedSignal } from '../entities/need-signal.entity';
import { NeedSignalStatus } from 'src/public/enums/public.enums';

export interface NeedSignalMapClusterDto {
  id: string;
  country: string;
  state: string;
  city: string;
  latitude: number;
  longitude: number;
  totalSignals: number;
  totalImpacted: number;
  verifiedChurchesCount: number;
}

@Injectable()
export class GetMapAggregatedNeedSignalsUseCase {
  constructor(
    @InjectRepository(NeedLocation)
    private readonly needLocationRepository: Repository<NeedLocation>,
    @InjectRepository(NeedSignal)
    private readonly needSignalRepository: Repository<NeedSignal>,
  ) {}

  async execute(): Promise<NeedSignalMapClusterDto[]> {
    // Para optimizar en el futuro, esto debería hacerse con un query builder y un GROUP BY
    // o hidratado desde Redis, pero por ahora conservamos la lógica adaptándola
    // a la estricta protección de PII.
    const locations = await this.needLocationRepository.find();

    const signals = await this.needSignalRepository.find({
      where: { status: NeedSignalStatus.OPEN },
    });

    const verifiedChurches = await this.needSignalRepository.manager
      .getRepository('church_public_profiles')
      .find({
        where: { isVerified: true },
      });

    const result = locations
      .map((loc) => {
        const locationSignals = signals.filter(
          (s) => s.needLocationId === loc.id,
        );
        if (locationSignals.length === 0) return null;

        const totalImpacted = locationSignals.reduce(
          (acc, s) => acc + s.impactedPeopleCount,
          0,
        );

        // Usamos el location actual que tiene city en formato normalizado
        const verifiedChurchesCount = verifiedChurches.filter(
          (c) => (c as any).geoCity === loc.city,
        ).length;

        return {
          id: loc.id,
          country: loc.country,
          state: loc.state,
          city: loc.city,
          latitude: loc.latitude,
          longitude: loc.longitude,
          totalSignals: locationSignals.length,
          totalImpacted: totalImpacted,
          verifiedChurchesCount: verifiedChurchesCount,
        };
      })
      .filter((loc) => loc !== null);

    return result as NeedSignalMapClusterDto[];
  }
}
