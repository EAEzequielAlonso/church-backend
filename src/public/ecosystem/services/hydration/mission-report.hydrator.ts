import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { IEcosystemEntityHydrator } from './hydration.interface';
import { EcosystemActivity } from '../../entities/ecosystem-activity.entity';
import { EcosystemActivityEntityType } from '../../enums/ecosystem.enums';
import { MissionReport } from '../../../missions/entities/mission-report.entity';

@Injectable()
export class MissionReportHydrator implements IEcosystemEntityHydrator {
  readonly entityType = EcosystemActivityEntityType.MISSION_REPORT;

  constructor(
    @InjectRepository(MissionReport)
    private readonly missionReportRepository: Repository<MissionReport>,
  ) {}

  async hydrate(activities: EcosystemActivity[]): Promise<void> {
    if (!activities.length) return;

    // 1. Extract unique entity IDs
    const entityIds = [...new Set(activities.map((a) => a.entityId))];

    // 2. Fetch all related public reports with media in a single batch query
    const reports = await this.missionReportRepository.find({
      where: { 
        id: In(entityIds),
        isPublic: true,
      },
      relations: ['media'],
    });

    // 3. Create a map for O(1) lookup
    const reportMap = new Map(reports.map((r) => [r.id, r]));

    // 4. Attach the live entity to the activity object dynamically
    for (const activity of activities) {
      const liveReport = reportMap.get(activity.entityId);
      if (liveReport) {
        (activity as any).liveMissionReport = {
          id: liveReport.id,
          title: liveReport.title,
          content: liveReport.content, // or maybe an excerpt? The requirement says content/excerpt that the card uses.
          category: liveReport.category,
          isPublic: liveReport.isPublic,
          media: liveReport.media.map(m => ({
            id: m.id,
            url: m.url,
            order: m.order,
            observation: m.observation,
          })),
        };
      }
    }
  }
}
