import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NeedSignal } from '../../need/entities/need-signal.entity';
import { PublicChurchRelationStatus, PublicChurchRelationType, NeedSignalStatus } from '../../enums/public.enums';
import { ChurchOwnershipService } from '../../church/services/church-ownership.service';
import { ChurchPublicProfile } from '../../church/entities/church_public_profile.entity';
import { PublicChurchRelation } from '../../church/entities/public_church_relation.entity';
import { GeoNormalizationUtil } from '../geo/utils/geo-normalization.util';

export enum OpportunityType {
  PRIORIDAD_MISIONERA = 'PRIORIDAD_MISIONERA',
  OPORTUNIDAD_EXPANSION = 'OPORTUNIDAD_EXPANSION',
  PRESENCIA_INICIAL = 'PRESENCIA_INICIAL',
  COBERTURA_SALUDABLE = 'COBERTURA_SALUDABLE',
  SIN_PRESENCIA = 'SIN_PRESENCIA',
}

export enum CoverageLevel {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export interface CityData {
  city: string;
  state: string;
  country: string;
  churches: number;
  verifiedChurches: number;
  members: number;
  visitors: number;
  needSignals: number;
  peopleLooking: number;
}

@Injectable()
export class TerritorialService {
  constructor(
    @InjectRepository(ChurchPublicProfile) private readonly churchProfiles: Repository<ChurchPublicProfile>,
    @InjectRepository(PublicChurchRelation) private readonly relations: Repository<PublicChurchRelation>,
    @InjectRepository(NeedSignal) private readonly signals: Repository<NeedSignal>,
    private readonly ownership: ChurchOwnershipService,
  ) { }

  async getDashboard() {
    // 1. Get raw stats from databases grouped by lowercased city, state, country
    const churchStats = await this.churchProfiles.createQueryBuilder('p')
      .select('MAX(p.city)', 'city')
      .addSelect('MAX(p.state)', 'state')
      .addSelect('MAX(p.country)', 'country')
      .addSelect('COUNT(*)', 'total_churches')
      .addSelect(`COUNT(*) FILTER (WHERE p.isVerified = true OR p.lifecycleState IN ('HEALTHY', 'VERIFIED'))`, 'verified_churches')
      .where('p.city IS NOT NULL')
      .groupBy('LOWER(TRIM(p.city)), LOWER(TRIM(p.state)), LOWER(TRIM(p.country))')
      .getRawMany();

    const relationStats = await this.relations.createQueryBuilder('r')
      .innerJoin('church_public_profiles', 'p', 'p."churchId" = r."churchId"')
      .select('MAX(p.city)', 'city')
      .addSelect('MAX(p.state)', 'state')
      .addSelect('MAX(p.country)', 'country')
      .addSelect(`COUNT(*) FILTER (WHERE r."relationType" = '${PublicChurchRelationType.COMMUNITY_MEMBER}' AND r.status = '${PublicChurchRelationStatus.APPROVED}')`, 'members')
      .addSelect(`COUNT(*) FILTER (WHERE r."relationType" = '${PublicChurchRelationType.REGULAR_VISITOR}' AND r.status = '${PublicChurchRelationStatus.APPROVED}')`, 'visitors')
      .where('p.city IS NOT NULL')
      .groupBy('LOWER(TRIM(p.city)), LOWER(TRIM(p.state)), LOWER(TRIM(p.country))')
      .getRawMany();

    const signalStats = await this.signals.createQueryBuilder('s')
      .innerJoin('s.needLocation', 'l')
      .select('MAX(l.city)', 'city')
      .addSelect('MAX(l.state)', 'state')
      .addSelect('MAX(l.country)', 'country')
      .addSelect('COUNT(*)', 'need_signals')
      .addSelect('SUM(s."impactedPeopleCount")', 'people_looking')
      .where('s.status = :status', { status: NeedSignalStatus.OPEN })
      .groupBy('LOWER(TRIM(l.city)), LOWER(TRIM(l.state)), LOWER(TRIM(l.country))')
      .getRawMany();

    // 2. Merge data by normalized keys
    const citiesMap = new Map<string, CityData>();

    const mergeIntoMap = (rows: any[], type: 'church' | 'relation' | 'signal') => {
      for (const row of rows) {
        if (!row.city || !row.state) continue;

        const norm_city = GeoNormalizationUtil.normalizeString(row.city);
        const norm_state = GeoNormalizationUtil.normalizeString(row.state);
        const norm_country = GeoNormalizationUtil.normalizeString(row.country || '');

        const key = `${norm_city}|${norm_state}|${norm_country}`;
        const existing = citiesMap.get(key) || {
          city: row.city,
          state: row.state,
          country: row.country,
          churches: 0,
          verifiedChurches: 0,
          members: 0,
          visitors: 0,
          needSignals: 0,
          peopleLooking: 0,
        };

        if (type === 'church') {
          existing.churches += Number(row.total_churches || 0);
          existing.verifiedChurches += Number(row.verified_churches || 0);
          // If we have proper casing from church profile, use it
          if (row.city) existing.city = row.city;
          if (row.state) existing.state = row.state;
          if (row.country) existing.country = row.country;
        } else if (type === 'relation') {
          existing.members += Number(row.members || 0);
          existing.visitors += Number(row.visitors || 0);
        } else if (type === 'signal') {
          existing.needSignals += Number(row.need_signals || 0);
          existing.peopleLooking += Number(row.people_looking || 0);
        }

        citiesMap.set(key, existing);
      }
    };

    mergeIntoMap(churchStats, 'church');
    mergeIntoMap(relationStats, 'relation');
    mergeIntoMap(signalStats, 'signal');

    // 3. Calculate scores and classifications
    const coverage: any[] = [];
    const opportunities: any[] = [];

    let hotspotsCount = 0;
    let activeNeedSignals = 0;
    let peopleLookingCount = 0;
    const countriesSet = new Set<string>();

    for (const city of citiesMap.values()) {
      if (city.country) countriesSet.add(city.country.toLowerCase().trim());
      activeNeedSignals += city.needSignals;
      peopleLookingCount += city.peopleLooking;

      const urgencyScore = this.calculateUrgencyScore(city);
      const opportunityType = this.classifyOpportunity(city, urgencyScore);
      const coverageLevel = this.classifyCoverage(city);

      const cityResult = {
        ...city,
        urgencyScore,
        opportunityType,
        coverageLevel,
      };

      coverage.push(cityResult);

      if (opportunityType !== OpportunityType.COBERTURA_SALUDABLE && opportunityType !== OpportunityType.PRESENCIA_INICIAL) {
        opportunities.push(cityResult);
      }

      if (opportunityType === OpportunityType.PRIORIDAD_MISIONERA) {
        hotspotsCount++;
      }
    }

    // Sort opportunities by urgency score descending
    opportunities.sort((a, b) => b.urgencyScore - a.urgencyScore);

    // Sort coverage by total churches descending
    coverage.sort((a, b) => b.churches - a.churches);

    return {
      summary: {
        hotspots: hotspotsCount,
        activeNeedSignals,
        peopleLooking: peopleLookingCount,
        countriesReached: countriesSet.size,
      },
      opportunities: opportunities.slice(0, 20), // Top 20 opportunities
      coverage,
      growth: {
        // Placeholder for phase 6B
        churchesLast30d: 0,
        signalsLast30d: 0,
      }
    };
  }

  async getMyZone(userId: string) {
    const churchIds = await this.ownership.getOwnedChurchIds(userId);
    if (!churchIds.length) {
      return null;
    }

    const churchId = churchIds[0];
    const profile = await this.churchProfiles.findOne({ where: { churchId }, relations: ['church'] });

    if (!profile || !profile.city || !profile.state) {
      return null;
    }

    // Get the whole dashboard to reuse calculations
    const dashboard = await this.getDashboard();

    const zoneCoverage = dashboard.coverage.find(c =>
      GeoNormalizationUtil.normalizeString(c.city) === GeoNormalizationUtil.normalizeString(profile.city!) &&
      GeoNormalizationUtil.normalizeString(c.state) === GeoNormalizationUtil.normalizeString(profile.state!)
    );

    // Find nearby opportunities (same state, different city)
    const nearbyOpportunities = dashboard.opportunities
      .filter(o =>
        GeoNormalizationUtil.normalizeString(o.state) === GeoNormalizationUtil.normalizeString(profile.state!) &&
        GeoNormalizationUtil.normalizeString(o.city) !== GeoNormalizationUtil.normalizeString(profile.city!)
      )
      .slice(0, 3); // Top 3 nearby

    return {
      church: {
        id: churchId,
        name: profile.church.canonicalName,
        city: profile.city,
        state: profile.state,
        country: profile.country,
      },
      zone: zoneCoverage || {
        churches: 1,
        peopleLooking: 0,
        needSignals: 0,
        coverageLevel: CoverageLevel.LOW,
      },
      nearbyOpportunities,
    };
  }

  private calculateUrgencyScore(city: CityData): number {
    const needWeight = city.needSignals * 3;
    const lookingWeight = city.peopleLooking * 2;
    const churchPenalty = city.churches * 5;
    const verifiedBonus = city.verifiedChurches * 3;
    const memberPenalty = Math.min(city.members, 20) * 0.5;

    return Math.max(0, needWeight + lookingWeight - churchPenalty - verifiedBonus - memberPenalty);
  }

  private classifyOpportunity(city: CityData, urgencyScore: number): OpportunityType {
    if (city.churches === 0 && urgencyScore > 5) return OpportunityType.PRIORIDAD_MISIONERA;
    if (city.churches === 0 && urgencyScore > 0) return OpportunityType.SIN_PRESENCIA;
    if (city.churches > 0 && urgencyScore > 10) return OpportunityType.OPORTUNIDAD_EXPANSION;
    if (city.churches <= 2 && city.verifiedChurches === 0) return OpportunityType.PRESENCIA_INICIAL;
    return OpportunityType.COBERTURA_SALUDABLE;
  }

  private classifyCoverage(city: CityData): CoverageLevel {
    if (city.churches === 0) return CoverageLevel.NONE;
    if (city.churches <= 2 && city.verifiedChurches === 0) return CoverageLevel.LOW;
    if (city.verifiedChurches >= 1 || city.churches > 2) return CoverageLevel.MEDIUM;
    if (city.verifiedChurches >= 2 && city.churches >= 3) return CoverageLevel.HIGH;
    return CoverageLevel.MEDIUM;
  }
}
