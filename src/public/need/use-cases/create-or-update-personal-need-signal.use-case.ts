import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NeedSignal } from '../entities/need-signal.entity';
import { NeedLocation } from '../entities/need-location.entity';
import { CreateOrUpdateNeedSignalDto } from '../dto/need-signal.dto';
import { NeedSignalStatus } from '../../enums/public.enums';
import { Person } from '../../../core/users/entities/person.entity';
import { GeoNormalizationUtil } from '../../ecosystem/geo/utils/geo-normalization.util';
import { GeoService } from '../../ecosystem/geo/geo.service';
import { EcosystemActivitiesService } from '../../ecosystem/services/ecosystem-activities.service';
import {
  EcosystemActivityType,
  EcosystemActivityEntityType,
} from '../../ecosystem/enums/ecosystem.enums';

@Injectable()
export class CreateOrUpdatePersonalNeedSignalUseCase {
  constructor(
    @InjectRepository(NeedSignal)
    private readonly needSignalRepository: Repository<NeedSignal>,
    @InjectRepository(NeedLocation)
    private readonly needLocationRepository: Repository<NeedLocation>,
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    private readonly activitiesService: EcosystemActivitiesService,
    private readonly geoService: GeoService,
  ) {}

  async execute(
    personId: string,
    dto: CreateOrUpdateNeedSignalDto,
  ): Promise<NeedSignal> {
    const person = await this.personRepository.findOne({
      where: { id: personId },
    });
    if (!person) throw new NotFoundException('Person no encontrada');

    // Regla de dominio: La ubicación siempre proviene del perfil del usuario.
    if (!person.country || !person.state || !person.city) {
      throw new BadRequestException(
        'Tu perfil no tiene una ciudad configurada. Actualízalo para continuar.',
      );
    }

    const nCountry = GeoNormalizationUtil.normalizeString(person.country);
    const nState = GeoNormalizationUtil.normalizeString(person.state);
    const nCity = GeoNormalizationUtil.normalizeString(person.city);

    // Obtener o crear NeedLocation correspondiente a la ciudad del usuario
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
        throw new BadRequestException(
          'No pudimos localizar geográficamente tu ciudad. Por favor intenta más tarde o revisa tu perfil.',
        );
      }
    }

    // Regla de dominio: Un usuario solo puede tener UNA Personal Need Signal activa o inactiva en total.
    const existingSignal = await this.needSignalRepository.findOne({
      where: { personId },
    });

    if (existingSignal) {
      // Regla de dominio: Si el usuario cambia de ciudad, migrar la señal automáticamente.
      if (existingSignal.needLocationId !== needLocation.id) {
        existingSignal.needLocationId = needLocation.id;
      }

      // Si estaba cerrada, la reactivamos a OPEN y limpiamos el motivo de cierre.
      if (existingSignal.status === NeedSignalStatus.CLOSED) {
        existingSignal.status = NeedSignalStatus.OPEN;
        existingSignal.closeReason = null;
      }

      Object.assign(existingSignal, {
        note: dto.note ?? existingSignal.note,
        impactedPeopleCount:
          dto.impactedPeopleCount ?? existingSignal.impactedPeopleCount,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        contactUrl: dto.contactUrl,
      });

      const updatedSignal =
        await this.needSignalRepository.save(existingSignal);

      // Actividad en el ecosistema (crear o actualizar)
      await this.activitiesService.logActivity({
        actorPersonId: personId,
        activityType: EcosystemActivityType.NEED_SIGNAL_CREATED,
        entityId: updatedSignal.id,
        entityType: EcosystemActivityEntityType.NEED_SIGNAL,
        country: needLocation.country,
        state: needLocation.state,
        city: needLocation.city,
        metadata: {
          noteText: dto.note,
          city: needLocation.city,
          state: needLocation.state,
          locationId: needLocation.id,
        },
      });

      return updatedSignal;
    }

    // Creación de una nueva NeedSignal (si no existe NINGUNA)
    const newSignal = this.needSignalRepository.create({
      personId, // Regla de dominio: siempre pertenece al usuario autenticado.
      needLocationId: needLocation.id,
      status: NeedSignalStatus.OPEN,
      note: dto.note,
      impactedPeopleCount: dto.impactedPeopleCount ?? 1,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      contactUrl: dto.contactUrl,
    });

    const savedSignal = await this.needSignalRepository.save(newSignal);

    // Actividad en el ecosistema usando metadata snapshot
    await this.activitiesService.logActivity({
      actorPersonId: personId,
      activityType: EcosystemActivityType.NEED_SIGNAL_CREATED,
      entityId: savedSignal.id,
      entityType: EcosystemActivityEntityType.NEED_SIGNAL,
      country: needLocation.country,
      state: needLocation.state,
      city: needLocation.city,
      metadata: {
        noteText: dto.note,
        city: needLocation.city,
        state: needLocation.state,
        locationId: needLocation.id,
      },
    });

    return savedSignal;
  }
}
