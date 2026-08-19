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
import { CancelMissionDto } from '../dto/cancel-mission.dto';
import { CreateMissionNeedDto } from '../dto/create-mission-need.dto';
import { UpdateMissionNeedDto } from '../dto/update-mission-need.dto';
import { FulfillMissionNeedDto } from '../dto/fulfill-mission-need.dto';
import { CreateMissionCollaborationDto } from '../dto/create-mission-collaboration.dto';
import { CreateMissionReportDto } from '../dto/create-mission-report.dto';
import { UpdateMissionReportDto } from '../dto/update-mission-report.dto';
import { UpdateMissionCollaborationDto } from '../dto/update-mission-collaboration.dto';
import { MissionProjectResponseDto } from '../dto/mission-response.dto';
import { MissionProjectStatus } from '../enums/missions.enums';
import { PaginationQueryDto } from 'src/shared/dtos/pagination-query.dto';
import { PaginatedResponseDto } from 'src/shared/dtos/paginated-response.dto';
import { MissionNeedQueryDto } from '../dto/mission-need-query.dto';
import { MissionReportQueryDto } from '../dto/mission-report-query.dto';
import { MissionCollaborationQueryDto } from '../dto/mission-collaboration-query.dto';

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
    @Query() query: PaginationQueryDto,
  ) {
    const actor = { id: context.personId } as Person;
    const result = await this.missionsService.findAllManagementByChurch(
      churchId,
      query,
      actor,
    );
    return result;
  }

  @Get('church/:churchId/collaborations')
  async getChurchCollaborations(
    @Param('churchId') churchId: string,
    @Query() query: PaginationQueryDto,
    @CurrentUser() context: any,
  ) {
    const actor = { id: context.personId } as Person;
    return this.collabsService.findChurchCollaborations(churchId, query, actor);
  }

  @Get(':id')
  async getManagementMission(
    @Param('id') id: string,
    @CurrentUser() context: any,
  ) {
    const actor = { id: context.personId } as Person;
    return this.missionsService.getManagementMission(id, actor);
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

  @Delete(':id')
  async removeMission(@Param('id') id: string, @CurrentUser() context: any) {
    const actor = { id: context.personId } as Person;
    return this.missionsService.remove(id, actor);
  }

  @Post(':id/cancel')
  async cancelMission(
    @Param('id') id: string,
    @Body() dto: CancelMissionDto,
    @CurrentUser() context: any,
  ) {
    const actor = { id: context.personId } as Person;
    return this.missionsService.cancelMission(id, dto, actor);
  }

  @Post(':id/activate')
  async activateMission(@Param('id') id: string, @CurrentUser() context: any) {
    const actor = { id: context.personId } as Person;
    return this.missionsService.changeStatus(
      id,
      MissionProjectStatus.ACTIVE,
      actor,
    );
  }

  @Post(':id/pause')
  async pauseMission(@Param('id') id: string, @CurrentUser() context: any) {
    const actor = { id: context.personId } as Person;
    return this.missionsService.changeStatus(
      id,
      MissionProjectStatus.PAUSED,
      actor,
    );
  }

  @Post(':id/resume')
  async resumeMission(@Param('id') id: string, @CurrentUser() context: any) {
    const actor = { id: context.personId } as Person;
    return this.missionsService.changeStatus(
      id,
      MissionProjectStatus.ACTIVE,
      actor,
    );
  }

  @Get(':id/needs')
  async getNeeds(
    @Param('id') id: string,
    @Query() query: MissionNeedQueryDto,
    @CurrentUser() context: any,
  ) {
    const actor = { id: context.personId } as Person;
    return this.needsService.findManagementNeeds(id, query, actor);
  }

  @Get(':id/reports')
  async getReports(
    @Param('id') id: string,
    @Query() query: MissionReportQueryDto,
    @CurrentUser() context: any,
  ) {
    const actor = { id: context.personId } as Person;
    return this.reportsService.findManagementReports(id, query, actor);
  }

  @Get(':id/collaborations')
  async getCollaborations(
    @Param('id') id: string,
    @Query() query: MissionCollaborationQueryDto,
    @CurrentUser() context: any,
  ) {
    const actor = { id: context.personId } as Person;
    return this.collabsService.findManagementCollaborations(id, query, actor);
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

  @Post(':id/needs/:needId/fulfill')
  async fulfillNeed(
    @Param('id') id: string,
    @Param('needId') needId: string,
    @Body() dto: FulfillMissionNeedDto,
    @CurrentUser() context: any,
  ) {
    const actor = { id: context.personId } as Person;
    return this.needsService.fulfillNeed(id, needId, dto, actor);
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

  @Post(':id/collaborations/:collabId/approve')
  async approveCollaboration(
    @Param('id') id: string,
    @Param('collabId') collabId: string,
    @CurrentUser() context: any,
  ) {
    const actor = { id: context.personId } as Person;
    return this.collabsService.approveCollaboration(id, collabId, actor);
  }

  @Post(':id/collaborations/:collabId/reject')
  async rejectCollaboration(
    @Param('id') id: string,
    @Param('collabId') collabId: string,
    @CurrentUser() context: any,
  ) {
    const actor = { id: context.personId } as Person;
    return this.collabsService.rejectCollaboration(id, collabId, actor);
  }

  @Post(':id/collaborations/:collabId/withdraw')
  async withdrawCollaboration(
    @Param('id') id: string,
    @Param('collabId') collabId: string,
    @CurrentUser() context: any,
  ) {
    const actor = { id: context.personId } as Person;
    return this.collabsService.withdrawCollaboration(id, collabId, actor);
  }

  @Post(':id/collaborations/:collabId/revoke')
  async revokeCollaboration(
    @Param('id') id: string,
    @Param('collabId') collabId: string,
    @CurrentUser() context: any,
  ) {
    const actor = { id: context.personId } as Person;
    return this.collabsService.revokeCollaboration(id, collabId, actor);
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
