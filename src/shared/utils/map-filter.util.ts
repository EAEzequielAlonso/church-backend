import { SelectQueryBuilder } from 'typeorm';
import { MapViewportDto } from '../dtos/map-viewport.dto';
import { MapLayerResponseDto } from '../dtos/map-layer-response.dto';

export class MapFilterUtil {
  /**
   * Applies the bounding box geographic filter to a QueryBuilder
   */
  static applyViewportFilter<T>(
    qb: SelectQueryBuilder<T>,
    viewport: MapViewportDto,
    latColumn = 'latitude',
    lngColumn = 'longitude',
  ): SelectQueryBuilder<T> {
    if (
      viewport.neLat != null &&
      viewport.neLng != null &&
      viewport.swLat != null &&
      viewport.swLng != null
    ) {
      qb.andWhere(`${latColumn} <= :neLat`, { neLat: viewport.neLat });
      qb.andWhere(`${latColumn} >= :swLat`, { swLat: viewport.swLat });
      qb.andWhere(`${lngColumn} <= :neLng`, { neLng: viewport.neLng });
      qb.andWhere(`${lngColumn} >= :swLng`, { swLng: viewport.swLng });
    }
    return qb;
  }

  /**
   * Fetches results with a limit, returning a MapLayerResponseDto with hasMore flag.
   */
  static async getPaginatedMapResults<T, R>(
    qb: SelectQueryBuilder<T>,
    limit: number,
    mapper: (entity: T) => R,
  ): Promise<MapLayerResponseDto<R>> {
    // Fetch limit + 1 to check if there are more results available
    qb.take(limit + 1);
    const results = await qb.getMany();

    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;

    return new MapLayerResponseDto(items.map(mapper), hasMore);
  }

  /**
   * Fetches raw results with a limit, returning a MapLayerResponseDto with hasMore flag.
   */
  static async getPaginatedRawMapResults<T, R>(
    qb: SelectQueryBuilder<T>,
    limit: number,
    mapper: (raw: any) => R,
  ): Promise<MapLayerResponseDto<R>> {
    qb.limit(limit + 1);
    const results = await qb.getRawMany();

    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;

    return new MapLayerResponseDto(items.map(mapper), hasMore);
  }

  /**
   * Ordena los resultados por proximidad geográfica a un punto específico,
   * calculando una distancia euclidiana aproximada ajustada por latitud.
   * Útil cuando no se dispone de PostGIS.
   */
  static applyProximitySort<T>(
    qb: SelectQueryBuilder<T>,
    lat: number,
    lng: number,
    latColumn = 'latitude',
    lngColumn = 'longitude',
  ): SelectQueryBuilder<T> {
    // Euclidean distance approximation considering latitude scaling factor
    // Using simple math since it's only for ORDER BY ascending
    qb.addSelect(
      `(POWER(${latColumn} - :lat, 2) + POWER((${lngColumn} - :lng) * COS(RADIANS(:lat)), 2))`,
      'distance_sq',
    );
    qb.setParameter('lat', lat);
    qb.setParameter('lng', lng);
    qb.orderBy('distance_sq', 'ASC');
    return qb;
  }
}
