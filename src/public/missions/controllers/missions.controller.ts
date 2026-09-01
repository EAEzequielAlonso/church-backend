import {
  Controller,
  Get,
  Param,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { MissionsService } from '../services/missions.service';
import { MissionNeedsService } from '../services/mission-needs.service';
import { MissionReportsService } from '../services/mission-reports.service';
import { MissionCollaborationsService } from '../services/mission-collaborations.service';
import { MissionProjectResponseDto } from '../dto/mission-response.dto';
import { MissionNeedProductDto } from '../dto/mission-need-product.dto';
import { MissionReportProductDto } from '../dto/mission-report-product.dto';
import { MissionCollaborationProductDto } from '../dto/mission-collaboration-product.dto';
import { PaginationQueryDto } from 'src/shared/dtos/pagination-query.dto';
import { PaginatedResponseDto } from 'src/shared/dtos/paginated-response.dto';
import { MissionNeedQueryDto } from '../dto/mission-need-query.dto';
import { MissionReportQueryDto } from '../dto/mission-report-query.dto';
import { MissionCollaborationQueryDto } from '../dto/mission-collaboration-query.dto';
import { CurrentUser } from '../../../common/decorators';
import { Person } from '../../../core/users/entities/person.entity';
import { MapViewportDto } from 'src/shared/dtos/map-viewport.dto';
import { MissionDirectoryQueryDto } from '../dto/mission-directory-query.dto';

@Controller('public/missions')
export class MissionsController {
  constructor(
    private readonly missionsService: MissionsService,
    private readonly needsService: MissionNeedsService,
    private readonly reportsService: MissionReportsService,
    private readonly collabsService: MissionCollaborationsService,
  ) {}

  @Get()
  async findAll(@Query() query: MissionDirectoryQueryDto) {
    const result = await this.missionsService.findAllActive(query);
    return new PaginatedResponseDto(
      result.data.map((m) => MissionProjectResponseDto.fromEntity(m)),
      result.total,
      result.page,
      result.pageSize,
    );
  }

  @Get('map')
  async mapMarkers(@Query() viewport: MapViewportDto) {
    return this.missionsService.mapMarkers(viewport);
  }

  @Get('church/:churchId/involved')
  async getChurchInvolvedMissions(
    @Param('churchId') churchId: string,
    @Query() query: PaginationQueryDto
  ) {
    const result = await this.missionsService.findInvolvedByChurch(churchId, query);
    return new PaginatedResponseDto(
      result.data.map((m) => MissionProjectResponseDto.fromEntity(m)),
      result.total,
      result.page,
      result.pageSize,
    );
  }

  @Get(':id/map-summary')
  async mapSummary(@Param('id') id: string) {
    const result = await this.missionsService.mapSummary(id);
    if (!result) throw new NotFoundException('Mission not found');
    return result;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const mission = await this.missionsService.getPublicMission(id);
    return MissionProjectResponseDto.fromEntity(mission);
  }

  @Get(':id/needs')
  async getNeeds(
    @Param('id') id: string,
    @Query() query: MissionNeedQueryDto,
    @CurrentUser() context?: any,
  ) {
    const user = context ? ({ id: context.personId } as Person) : undefined;
    return this.needsService.findPublicNeeds(id, query, user);
  }

  @Get(':id/reports')
  async getReports(
    @Param('id') id: string,
    @Query() query: MissionReportQueryDto,
    @CurrentUser() context?: any,
  ) {
    const user = context ? ({ id: context.personId } as Person) : undefined;
    return this.reportsService.findPublicReports(id, query, user);
  }

  @Get(':id/collaborations')
  async getCollaborations(
    @Param('id') id: string,
    @Query() query: MissionCollaborationQueryDto,
    @CurrentUser() context?: any,
  ) {
    const user = context ? ({ id: context.personId } as Person) : undefined;
    return this.collabsService.findPublicCollaborations(id, query, user);
  }
}
