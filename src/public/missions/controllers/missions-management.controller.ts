import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { SecurityContextGuard } from '../../../core/auth/guards/security-context.guard';
import { CurrentUser } from '../../../common/decorators';
import { Person } from '../../../core/users/entities/person.entity';
import { MissionsService } from '../services/missions.service';
import { MissionNeedsService } from '../services/mission-needs.service';
import { MissionCollaborationsService } from '../services/mission-collaborations.service';
import { MissionReportsService } from '../services/mission-reports.service';
import { CreateMissionProjectDto } from '../dto/create-mission-project.dto';
import { UpdateMissionProjectDto } from '../dto/update-mission-project.dto';
import { CompleteMissionDto } from '../dto/complete-mission.dto';
import { CreateMissionNeedDto } from '../dto/create-mission-need.dto';
import { UpdateMissionNeedDto } from '../dto/update-mission-need.dto';
import { CreateMissionCollaborationDto } from '../dto/create-mission-collaboration.dto';
import { CreateMissionReportDto } from '../dto/create-mission-report.dto';
import { UpdateMissionReportDto } from '../dto/update-mission-report.dto';
import { UpdateMissionCollaborationDto } from '../dto/update-mission-collaboration.dto';
import { MissionProjectResponseDto } from '../dto/mission-response.dto';

@Controller('missions-management')
@UseGuards(JwtAuthGuard, SecurityContextGuard)
export class MissionsManagementController {
  constructor(
    private readonly missionsService: MissionsService,
    private readonly needsService: MissionNeedsService,
    private readonly collabsService: MissionCollaborationsService,
    private readonly reportsService: MissionReportsService,
  ) {}

  @Post()
  async createMission(
    @Body() dto: CreateMissionProjectDto,
    @CurrentUser() context: any,
  ) {
    const actor = { id: context.personId } as Person;
    return this.missionsService.create(dto, actor);
  }

  @Get('church/:churchId')
  async getChurchMissions(
    @Param('churchId') churchId: string,
    @CurrentUser() context: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const actor = { id: context.personId } as Person;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 12;
    
    const result = await this.missionsService.findAllByChurch(churchId, pageNum, limitNum);
    return {
      data: result.data.map((m) => MissionProjectResponseDto.fromEntity(m)),
      total: result.total,
      page: result.page,
      pageSize: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
      hasNextPage: result.page < Math.ceil(result.total / result.limit),
      hasPreviousPage: result.page > 1
    };
  }

  @Patch(':id')
  async updateMission(
    @Param('id') id: string,
    @Body() dto: UpdateMissionProjectDto,
    @CurrentUser() context: any,
  ) {
    const actor = { id: context.personId } as Person;
    return this.missionsService.update(id, dto, actor);
  }

  @Post(':id/complete')
  async completeMission(
    @Param('id') id: string,
    @Body() dto: CompleteMissionDto,
    @CurrentUser() context: any,
  ) {
    const actor = { id: context.personId } as Person;
    return this.missionsService.completeMission(id, dto, actor);
  }

  @Post(':id/cancel')
  async cancelMission(@Param('id') id: string, @CurrentUser() context: any) {
    const actor = { id: context.personId } as Person;
    return this.missionsService.cancelMission(id, actor);
  }

  @Post(':id/needs')
  async createNeed(
    @Param('id') id: string,
    @Body() dto: CreateMissionNeedDto,
    @CurrentUser() context: any,
  ) {
    const actor = { id: context.personId } as Person;
    return this.needsService.create(id, dto, actor);
  }

  @Patch(':id/needs/:needId')
  async updateNeed(
    @Param('id') id: string,
    @Param('needId') needId: string,
    @Body() dto: UpdateMissionNeedDto,
    @CurrentUser() context: any,
  ) {
    const actor = { id: context.personId } as Person;
    return this.needsService.update(id, needId, dto, actor);
  }

  @Delete(':id/needs/:needId')
  async removeNeed(
    @Param('id') id: string,
    @Param('needId') needId: string,
    @CurrentUser() context: any,
  ) {
    const actor = { id: context.personId } as Person;
    return this.needsService.remove(id, needId, actor);
  }

  @Post(':id/collaborations')
  async createCollaboration(
    @Param('id') id: string,
    @Body() dto: CreateMissionCollaborationDto,
    @CurrentUser() context: any,
  ) {
    const actor = { id: context.personId } as Person;
    return this.collabsService.create(id, dto, actor);
  }

  @Post(':id/reports')
  async createReport(
    @Param('id') id: string,
    @Body() dto: CreateMissionReportDto,
    @CurrentUser() context: any,
  ) {
    const actor = { id: context.personId } as Person;
    return this.reportsService.create(id, dto, actor);
  }

  @Patch(':id/reports/:reportId')
  async updateReport(
    @Param('id') id: string,
    @Param('reportId') reportId: string,
    @Body() dto: UpdateMissionReportDto,
    @CurrentUser() context: any,
  ) {
    const actor = { id: context.personId } as Person;
    return this.reportsService.update(id, reportId, dto, actor);
  }

  @Delete(':id/reports/:reportId')
  async removeReport(
    @Param('id') id: string,
    @Param('reportId') reportId: string,
    @CurrentUser() context: any,
  ) {
    const actor = { id: context.personId } as Person;
    return this.reportsService.remove(id, reportId, actor);
  }

  @Patch(':id/collaborations/:collabId')
  async updateCollaboration(
    @Param('id') id: string,
    @Param('collabId') collabId: string,
    @Body() dto: UpdateMissionCollaborationDto,
    @CurrentUser() context: any,
  ) {
    const actor = { id: context.personId } as Person;
    return this.collabsService.update(id, collabId, dto, actor);
  }

  @Delete(':id/collaborations/:collabId')
  async removeCollaboration(
    @Param('id') id: string,
    @Param('collabId') collabId: string,
    @CurrentUser() context: any,
  ) {
    const actor = { id: context.personId } as Person;
    return this.collabsService.remove(id, collabId, actor);
  }
}
