import {
  Controller,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
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
import { CreateMissionCollaborationDto } from '../dto/create-mission-collaboration.dto';
import { CreateMissionReportDto } from '../dto/create-mission-report.dto';

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
}
