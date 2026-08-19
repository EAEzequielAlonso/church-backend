import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NeedSignal } from '../entities/need-signal.entity';
import { NeedLocation } from '../entities/need-location.entity';
import { GeoNormalizationUtil } from '../../ecosystem/geo/utils/geo-normalization.util';
import { GeoService } from '../../ecosystem/geo/geo.service';

@Injectable()
export class NeedSignalAddressListener {
  private readonly logger = new Logger(NeedSignalAddressListener.name);

  constructor(
    @InjectRepository(NeedSignal)
    private readonly needSignalRepository: Repository<NeedSignal>,
    @InjectRepository(NeedLocation)
    private readonly needLocationRepository: Repository<NeedLocation>,
    private readonly geoService: GeoService,
  ) {}

  @OnEvent('user.profile.address.updated')
  async handleAddressUpdatedEvent(payload: {
    personId: string;
    country: string;
    state: string;
    city: string;
  }) {
    const { personId, country, state, city } = payload;

    const signal = await this.needSignalRepository.findOne({
      where: { personId },
    });

    if (!signal) {
      // Si la persona no tiene NeedSignal, no hacemos nada.
      return;
    }

    const nCountry = GeoNormalizationUtil.normalizeString(country);
    const nState = GeoNormalizationUtil.normalizeString(state);
    const nCity = GeoNormalizationUtil.normalizeString(city);

    let needLocation = await this.needLocationRepository.findOne({
      where: {
        country: nCountry,
        state: nState,
        city: nCity,
      },
    });

    if (!needLocation) {
      try {
        const geoResult = await this.geoService.geocodeChurchAddress({
          country: nCountry,
          state: nState,
          city: nCity,
        });

        needLocation = this.needLocationRepository.create({
          country: nCountry,
          state: nState,
          city: nCity,
          latitude: geoResult.latitude,
          longitude: geoResult.longitude,
        });
        needLocation = await this.needLocationRepository.save(needLocation);
      } catch (err) {
        this.logger.error(
          `No se pudo geolocalizar la nueva dirección del perfil para la persona ${personId}: ${err.message}`,
        );
        return;
      }
    }

    if (signal.needLocationId !== needLocation.id) {
      signal.needLocationId = needLocation.id;
      await this.needSignalRepository.save(signal);
      this.logger.log(`NeedSignal location updated for person ${personId}`);
    }
  }
}
