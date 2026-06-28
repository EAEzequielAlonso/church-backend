import { BadGatewayException, HttpException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ViewportQueryDto } from './dto/viewport-query.dto';
import { ChurchMapItemDto, MissionMapItemDto, SmallGroupMapItemDto, NeedSignalMapItemDto, ChurchNeedSignalMapItemDto, UnreachedAreaMapItemDto } from './dto/map-item.dto';
import { GeoNormalizationUtil } from './utils/geo-normalization.util';

type GeocodeInput = { address?: string; city?: string; state?: string; country?: string };

@Injectable()
export class GeoService {
  private readonly cache = new Map<string, { expiresAt: number; payload: any }>();
  private readonly cacheTtlMs = Number(process.env.GEO_CACHE_TTL ?? 86400) * 1000;
  private readonly minGapMs = 1100;
  private lastGeocodeAt = 0;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) { }

  private normalizeText(value?: string) { return (value ?? '').trim().replace(/\s+/g, ' '); }
  private cacheKey(input: GeocodeInput) { return JSON.stringify({ a: this.normalizeText(input.address).toLowerCase(), c: this.normalizeText(input.city).toLowerCase(), s: this.normalizeText(input.state).toLowerCase(), o: this.normalizeText(input.country).toLowerCase() }); }

  async geocodeChurchAddress(input: GeocodeInput) {
    const normalizedInput = { address: this.normalizeText(input.address), city: this.normalizeText(input.city), state: this.normalizeText(input.state), country: this.normalizeText(input.country) };
    const key = this.cacheKey(normalizedInput);
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return { ...cached.payload, fromCache: true };

    const wait = this.minGapMs - (Date.now() - this.lastGeocodeAt);
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));

    const q = [normalizedInput.address, normalizedInput.city, normalizedInput.state, normalizedInput.country].filter(Boolean).join(', ');
    if (!q) throw new BadGatewayException('Address query is empty');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const base = process.env.NOMINATIM_BASE_URL ?? 'https://nominatim.openstreetmap.org';

    let response: Response;
    try {
      response = await fetch(`${base}/search?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(q)}`, { signal: controller.signal, headers: { 'User-Agent': 'Saas-Iglesia/1.0 (public geocoding service)' } });
    } catch {
      throw new BadGatewayException('No pudimos conectar con el proveedor de geocoding.');
    } finally {
      clearTimeout(timeout);
      this.lastGeocodeAt = Date.now();
    }

    if (response.status === 429) throw new HttpException('Límite temporal de geocoding alcanzado. Intenta de nuevo en unos segundos.', 429);
    if (!response.ok) throw new BadGatewayException('El proveedor de geocoding no respondió correctamente.');

    const rows = await response.json() as any[];
    const first = rows[0];
    if (!first) throw new BadGatewayException('No encontramos una ubicación para esa dirección.');

    const payload = {
      normalizedAddress: this.normalizeText(first.display_name ?? q),
      latitude: Number(first.lat),
      longitude: Number(first.lon),
      city: this.normalizeText(first.address?.city ?? first.address?.town ?? first.address?.village ?? normalizedInput.city),
      state: this.normalizeText(first.address?.state ?? normalizedInput.state),
      country: this.normalizeText(first.address?.country ?? normalizedInput.country),
    };

    this.cache.set(key, { payload, expiresAt: Date.now() + this.cacheTtlMs });
    return { ...payload, fromCache: false };
  }

  async autocompleteLocations(query?: string) {
    if (!query || query.length < 2) return [];

    const normQuery = GeoNormalizationUtil.normalizeString(query);

    // Búsqueda LIKE básica en los campos para autocomplete parcial
    const rows = await this.dataSource.query(`
      SELECT DISTINCT country, state, city 
      FROM need_locations 
      WHERE city LIKE $1 
         OR state LIKE $1
         OR country LIKE $1
      LIMIT 10
    `, [`%${normQuery}%`]);

    return rows.map(r => ({
      country: r.country,
      state: r.state,
      city: r.city,
      label: `${r.city}, ${r.state}, ${r.country}`
    }));
  }

  async getViewport(query: ViewportQueryDto) {
    const { southWestLat, northEastLat, southWestLng, northEastLng } = query;
    const MAP_VIEWPORT_LIMIT = 500;

    // Ejecutamos en paralelo limitando los resultados por tipo de entidad
    const [churches, missions, groups, needs, churchNeeds, unreached] = await Promise.all([
      this.dataSource.query(`
        SELECT p.id, c.name, p.latitude, p.longitude, p.city, p.state, p."isCurrentAdmin", p."isVerified" as verified, 'VERIFIED' as "lifecycleState"
        FROM church_public_profiles p
        INNER JOIN churches c ON p."churchId" = c.id
        WHERE p.latitude BETWEEN $1 AND $2 AND p.longitude BETWEEN $3 AND $4
        LIMIT $5
      `, [southWestLat, northEastLat, southWestLng, northEastLng, MAP_VIEWPORT_LIMIT]),

      this.dataSource.query(`
        SELECT m.id, m.title, m.latitude, m.longitude, m.city, m.state, m.status, 
               (SELECT COUNT(*) FROM mission_collaborations mc WHERE mc."missionProjectId" = m.id) as "collaborationCount",
               (SELECT COUNT(*) FROM mission_needs mn WHERE mn."missionProjectId" = m.id) as "needCount"
        FROM mission_projects m
        WHERE m.latitude BETWEEN $1 AND $2 AND m.longitude BETWEEN $3 AND $4
        LIMIT $5
      `, [southWestLat, northEastLat, southWestLng, northEastLng, MAP_VIEWPORT_LIMIT]),

      this.dataSource.query(`
        SELECT s.id, s.name, s.latitude, s.longitude, s.city, s.state, s.status, s."capacityStatus"
        FROM small_groups s
        WHERE s.latitude BETWEEN $1 AND $2 AND s.longitude BETWEEN $3 AND $4
        LIMIT $5
      `, [southWestLat, northEastLat, southWestLng, northEastLng, MAP_VIEWPORT_LIMIT]),

      this.dataSource.query(`
        SELECT n.id, l.latitude, l.longitude, l.city, l.state, n.status,
               EXISTS(SELECT 1 FROM need_engagements e WHERE e."entityId" = n.id LIMIT 1) as "hasSupport",
               (SELECT COUNT(*) FROM need_engagements e WHERE e."entityId" = n.id) as "supportCount"
        FROM need_signals n
        INNER JOIN need_locations l ON n."needLocationId" = l.id
        WHERE l.latitude BETWEEN $1 AND $2 AND l.longitude BETWEEN $3 AND $4
        LIMIT $5
      `, [southWestLat, northEastLat, southWestLng, northEastLng, MAP_VIEWPORT_LIMIT]),

      this.dataSource.query(`
        SELECT cn.id, l.latitude, l.longitude, l.city, l.state, cn.status
        FROM church_need_signals cn
        INNER JOIN need_locations l ON cn."needLocationId" = l.id
        WHERE cn.status = 'OPEN' AND l.latitude BETWEEN $1 AND $2 AND l.longitude BETWEEN $3 AND $4
        LIMIT $5
      `, [southWestLat, northEastLat, southWestLng, northEastLng, MAP_VIEWPORT_LIMIT]),

      this.dataSource.query(`
        SELECT u.id, l.latitude, l.longitude, l.city, l.state, u.status
        FROM unreached_areas u
        INNER JOIN need_locations l ON u."needLocationId" = l.id
        WHERE l.latitude BETWEEN $1 AND $2 AND l.longitude BETWEEN $3 AND $4
        LIMIT $5
      `, [southWestLat, northEastLat, southWestLng, northEastLng, MAP_VIEWPORT_LIMIT])
    ]);

    return {
      churches: churches.map((c: any) => ({ ...c, latitude: Number(c.latitude), longitude: Number(c.longitude), type: 'CHURCH' } as ChurchMapItemDto)),
      missions: missions.map((m: any) => ({ ...m, latitude: Number(m.latitude), longitude: Number(m.longitude), collaborationCount: Number(m.collaborationCount), needCount: Number(m.needCount), type: 'MISSION' } as MissionMapItemDto)),
      smallGroups: groups.map((g: any) => ({ ...g, latitude: Number(g.latitude), longitude: Number(g.longitude), type: 'SMALL_GROUP' } as SmallGroupMapItemDto)),
      needSignals: needs.map((n: any) => ({ ...n, latitude: Number(n.latitude), longitude: Number(n.longitude), supportCount: Number(n.supportCount), type: 'NEED_SIGNAL' } as NeedSignalMapItemDto)),
      churchNeedSignals: churchNeeds.map((cn: any) => ({ ...cn, latitude: Number(cn.latitude), longitude: Number(cn.longitude), type: 'CHURCH_NEED_SIGNAL' } as ChurchNeedSignalMapItemDto)),
      unreachedAreas: unreached.map((u: any) => ({ ...u, latitude: Number(u.latitude), longitude: Number(u.longitude), type: 'UNREACHED_AREA' } as UnreachedAreaMapItemDto)),
    };
  }

  async needHeatmap() {
    return { data: [] };
  }
}
