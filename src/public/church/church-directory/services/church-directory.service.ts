import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChurchPublicProfile } from 'src/public/church/entities/church_public_profile.entity';
import { ChurchDirectoryQueryDto } from '../dto/church-directory-query.dto';
import { ChurchMapMarkerDto } from '../dto/church-map-marker.dto';
import { MapViewportDto } from 'src/shared/dtos/map-viewport.dto';
import { MapLayerResponseDto } from 'src/shared/dtos/map-layer-response.dto';
import { MapFilterUtil } from 'src/shared/utils/map-filter.util';

@Injectable()
export class ChurchDirectoryService {
  constructor(
    @InjectRepository(ChurchPublicProfile)
    private readonly repo: Repository<ChurchPublicProfile>,
  ) {}

  async find(query: ChurchDirectoryQueryDto) {
    const qb = this.repo
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.church', 'c');
    const hasCoords = query.latitude !== undefined && query.longitude !== undefined;

    if (!hasCoords && !query.search) {
      // Fallback: only filter by city/state/country if no coords and no explicit search
      if (query.city)
        qb.andWhere('LOWER(p.city) = LOWER(:city)', { city: query.city });
      if (query.state)
        qb.andWhere('LOWER(p.state) = LOWER(:state)', { state: query.state });
      if (query.country)
        qb.andWhere('LOWER(p.country) = LOWER(:country)', {
          country: query.country,
        });
    }

    if (hasCoords) {
      // Haversine formula for distance in kilometers
      qb.addSelect(
        `(6371 * acos(cos(radians(:lat)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(:lng)) + sin(radians(:lat)) * sin(radians(p.latitude))))`,
        'distance',
      );
      qb.setParameter('lat', query.latitude);
      qb.setParameter('lng', query.longitude);
    }
    if (query.verified !== undefined)
      qb.andWhere('p.isVerified = :verified', {
        verified: query.verified === 'true',
      });
    if (query.search)
      qb.andWhere('(LOWER(c.name) LIKE :q OR LOWER(p.city) LIKE :q)', {
        q: `%${query.search.toLowerCase()}%`,
      });
    // if (query.doctrinalTag) qb.andWhere(':doctrinalTag = ANY(p.essentialDoctrines)', { doctrinalTag: query.doctrinalTag });
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    if (hasCoords && !query.search && !query.sort) {
      qb.orderBy('distance', 'ASC');
    } else if (query.sort === 'city')
      qb.orderBy('p.city', 'ASC').addOrderBy('c.canonicalName', 'ASC');
    else if (query.sort === 'newest_claimed') qb.orderBy('p.updatedAt', 'DESC');
    else
      qb.orderBy('p.isVerified', 'DESC').addOrderBy('c.canonicalName', 'ASC');
    qb.skip((page - 1) * limit).take(limit);
    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((r) => ({
        id: r.churchId,
        slug: r.slug,
        canonicalSlug: r.slug,
        name: r.church.canonicalName,
        seoTitle: `${r.church.canonicalName} | Iglesia`,
        seoDescription: r.publicDescription?.slice(0, 160) ?? null,
        publicImage: r.coverUrl ?? r.mainImageUrl ?? r.logoUrl ?? null,
        logoUrl: r.logoUrl ?? null,
        city: r.city?.trim() ?? null,
        state: r.state?.trim() ?? null,
        country: r.country?.trim() ?? null,
        address: r.address ?? null,
        location: {
          latitude: r.latitude ? Number(r.latitude) : null,
          longitude: r.longitude ? Number(r.longitude) : null,
        },
        geoPrecision: r.geoPrecision,
        verified: r.isVerified,
        isVerified: r.isVerified,
        doctrinalTags: [],
        publicDescription: r.publicDescription ?? null,
        denomination: r.denomination ?? null,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async mapMarkers(
    viewport: MapViewportDto,
  ): Promise<MapLayerResponseDto<ChurchMapMarkerDto>> {
    const qb = this.repo
      .createQueryBuilder('p')
      .innerJoin('p.church', 'c')
      .where('p.latitude IS NOT NULL AND p.longitude IS NOT NULL')
      .select([
        'p.churchId AS id',
        'c.canonicalName AS name',
        'p.slug AS slug',
        'p.logoUrl AS "logoUrl"',
        'p.latitude AS latitude',
        'p.longitude AS longitude',
        'p.city AS city',
        'p.state AS state',
        'p.country AS country',
        'p.isVerified AS "isVerified"',
      ]);

    MapFilterUtil.applyViewportFilter(
      qb,
      viewport,
      'p.latitude',
      'p.longitude',
    );

    return MapFilterUtil.getPaginatedRawMapResults(
      qb,
      200,
      (row) =>
        new ChurchMapMarkerDto({
          id: row.id,
          name: row.name,
          slug: row.slug,
          logoUrl: row.logoUrl,
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          city: row.city,
          state: row.state,
          country: row.country,
          isVerified: row.isVerified,
        }),
    );
  }
}
