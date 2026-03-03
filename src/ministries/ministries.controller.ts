import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { MinistriesService } from './ministries.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AppPermission } from '../auth/authorization/permissions.enum';
import { CurrentChurch } from '../common/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MinistryRole } from '../common/enums';
import { CreateMinistryDto } from './dto/create-ministry.dto';

@Controller('ministries')
@UseGuards(JwtAuthGuard)
export class MinistriesController {
  constructor(private readonly ministriesService: MinistriesService) {}

  @Get()
  @RequirePermissions(AppPermission.MINISTRY_VIEW)
  findAll(@CurrentChurch() churchId: string) {
    return this.ministriesService.findAll(churchId);
  }

  @Post()
  @RequirePermissions(AppPermission.MINISTRY_MANAGE)
  create(@CurrentChurch() churchId: string, @Body() body: CreateMinistryDto) {
    return this.ministriesService.create(churchId, body);
  }

  @Get(':id')
  @RequirePermissions(AppPermission.MINISTRY_VIEW)
  findOne(@Param('id') id: string) {
    return this.ministriesService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions(AppPermission.MINISTRY_MANAGE)
  update(@Param('id') id: string, @Body() body: any) {
    return this.ministriesService.update(id, body);
  }

  // --- MEMBERS ---

  @Post(':id/members')
  @RequirePermissions(AppPermission.MINISTRY_MANAGE)
  addMember(
    @Param('id') id: string,
    @Body() body: { memberId: string; role: MinistryRole },
  ) {
    return this.ministriesService.addMember(id, body.memberId, body.role);
  }

  @Delete(':id/members/:memberId')
  @RequirePermissions(AppPermission.MINISTRY_MANAGE)
  removeMember(@Param('id') id: string, @Param('memberId') memberId: string) {
    return this.ministriesService.removeMember(id, memberId);
  }

  // --- EVENTS ---

  @Get(':id/events')
  @RequirePermissions(AppPermission.MINISTRY_VIEW)
  getEvents(@Param('id') id: string) {
    return this.ministriesService.getEvents(id);
  }

  @Post(':id/events')
  @RequirePermissions(AppPermission.MINISTRY_EVENT_MANAGE)
  createEvent(
    @Param('id') id: string,
    @Request() req: any,
    @CurrentChurch() churchId: string,
    @Body() body: any,
  ) {
    return this.ministriesService.createEvent(
      id,
      req.user.personId,
      churchId,
      body,
    );
  }

  // --- TASKS ---

  @Get(':id/tasks')
  @RequirePermissions(AppPermission.MINISTRY_VIEW)
  getTasks(@Param('id') id: string) {
    return this.ministriesService.getTasks(id);
  }

  @Post(':id/tasks')
  @RequirePermissions(AppPermission.MINISTRY_MANAGE)
  createTask(@Param('id') id: string, @Body() body: any) {
    return this.ministriesService.createTask(id, body);
  }

  @Patch(':id/tasks/:taskId')
  @RequirePermissions(AppPermission.MINISTRY_MANAGE)
  updateTask(@Param('taskId') taskId: string, @Body() body: any) {
    return this.ministriesService.updateTask(taskId, body);
  }

  @Delete(':id/tasks/:taskId')
  @RequirePermissions(AppPermission.MINISTRY_MANAGE)
  deleteTask(@Param('id') id: string, @Param('taskId') taskId: string) {
    return this.ministriesService.deleteTask(id, taskId);
  }

  // --- NOTES ---

  @Get('events/:eventId/notes')
  @RequirePermissions(AppPermission.MINISTRY_VIEW)
  getNote(@Param('eventId') eventId: string) {
    return this.ministriesService.getNote(eventId);
  }

  @Post('events/:eventId/notes')
  @RequirePermissions(AppPermission.MINISTRY_EVENT_MANAGE)
  createOrUpdateNote(
    @Param('eventId') eventId: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    return this.ministriesService.createOrUpdateNote(
      eventId,
      req.user.personId,
      body,
    );
  }
  // --- SERVICE DUTIES CONFIGURATION ---

  @Get('duties/all') // Global for template editor
  @RequirePermissions(AppPermission.MINISTRY_VIEW)
  getAllServiceDuties(@CurrentChurch() churchId: string) {
    return this.ministriesService.getAllServiceDuties(churchId);
  }

  @Get(':id/duties')
  @RequirePermissions(AppPermission.MINISTRY_VIEW)
  getServiceDuties(@Param('id') id: string) {
    return this.ministriesService.getServiceDuties(id);
  }

  @Post(':id/duties')
  @RequirePermissions(AppPermission.MINISTRY_MANAGE)
  createServiceDuty(
    @Param('id') id: string,
    @Body() body: { name: string; behaviorType?: string },
  ) {
    return this.ministriesService.createServiceDuty(
      id,
      body.name,
      body.behaviorType,
    );
  }

  @Delete(':id/duties/:dutyId')
  @RequirePermissions(AppPermission.MINISTRY_MANAGE)
  deleteServiceDuty(@Param('id') id: string, @Param('dutyId') dutyId: string) {
    return this.ministriesService.deleteServiceDuty(id, dutyId);
  }

  // --- MEMBER MANAGEMENT --

  @Patch(':id/members/:memberId')
  @RequirePermissions(AppPermission.MINISTRY_MANAGE)
  updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() body: { role: MinistryRole },
  ) {
    return this.ministriesService.updateMemberRole(id, memberId, body.role);
  }

  // --- SCHEDULE & ASSIGNMENTS ---

  @Get(':id/schedule')
  @RequirePermissions(AppPermission.MINISTRY_VIEW)
  getAssignments(
    @Param('id') id: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.ministriesService.getAssignments(id, from, to);
  }

  @Post(':id/schedule')
  @RequirePermissions(AppPermission.MINISTRY_MANAGE)
  createAssignments(
    @Param('id') id: string,
    @Body() body: { assignments: any[] },
  ) {
    return this.ministriesService.createAssignments(id, body.assignments);
  }

  @Delete(':id/schedule/:assignmentId')
  @RequirePermissions(AppPermission.MINISTRY_MANAGE)
  deleteAssignment(
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.ministriesService.deleteAssignment(id, assignmentId);
  }
}
