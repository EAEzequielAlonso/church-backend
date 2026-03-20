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

import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AppPermission } from '../auth/authorization/permissions.enum';
import { RequireMinistryRole } from '../auth/decorators/require-ministry-role.decorator';
import { MinistryRolesGuard } from './guards/ministry-roles.guard';
import { CurrentChurch, CurrentUser } from '../common/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MinistryRole } from '../common/enums';
import { CreateMinistryDto } from './dto/create-ministry.dto';
import { UpdateMinistryDto } from './dto/update-ministry.dto';
import { CreateMinistryEventDto } from './dto/create-ministry-event.dto';
import { CreateMinistryTaskDto } from './dto/create-ministry-task.dto';
import { UpdateMinistryTaskDto } from './dto/update-ministry-task.dto';
import { CreateOrUpdateMeetingNoteDto } from './dto/create-or-update-meeting-note.dto';
import { CreateServiceDutyDto } from './dto/create-service-duty.dto';
import { CreateMinistryAssignmentsDto } from './dto/create-ministry-assignments.dto';

// Use Cases
import { CreateMinistryUseCase } from './use-cases/create-ministry.use-case';
import { GetMinistriesUseCase } from './use-cases/get-ministries.use-case';
import { GetMinistryUseCase } from './use-cases/get-ministry.use-case';
import { UpdateMinistryUseCase } from './use-cases/update-ministry.use-case';
import { DeleteMinistryUseCase } from './use-cases/delete-ministry.use-case';
import { AddMinistryMemberUseCase } from './use-cases/add-ministry-member.use-case';
import { UpdateMinistryMemberRoleUseCase } from './use-cases/update-ministry-member-role.use-case';
import { DeleteMinistryMemberUseCase } from './use-cases/delete-ministry-member.use-case';
import { GetMinistryTasksUseCase } from './use-cases/get-ministry-tasks.use-case';
import { CreateMinistryTaskUseCase } from './use-cases/create-ministry-task.use-case';
import { UpdateMinistryTaskUseCase } from './use-cases/update-ministry-task.use-case';
import { DeleteMinistryTaskUseCase } from './use-cases/delete-ministry-task.use-case';
import { GetMinistryEventsUseCase } from './use-cases/get-ministry-events.use-case';
import { CreateMinistryEventUseCase } from './use-cases/create-ministry-event.use-case';
import { UpdateMinistryEventUseCase } from './use-cases/update-ministry-event.use-case';
import { DeleteMinistryEventUseCase } from './use-cases/delete-ministry-event.use-case';
import { GetMeetingNoteUseCase } from './use-cases/get-meeting-note.use-case';
import { CreateOrUpdateMeetingNoteUseCase } from './use-cases/create-or-update-meeting-note.use-case';
import { GetAllServiceDutiesUseCase } from './use-cases/get-all-service-duties.use-case';
import { GetServiceDutiesUseCase } from './use-cases/get-service-duties.use-case';
import { CreateServiceDutyUseCase } from './use-cases/create-service-duty.use-case';
import { DeleteServiceDutyUseCase } from './use-cases/delete-service-duty.use-case';
import { GetMinistryAssignmentsUseCase } from './use-cases/get-ministry-assignments.use-case';
import { CreateMinistryAssignmentsUseCase } from './use-cases/create-ministry-assignments.use-case';
import { DeleteMinistryAssignmentUseCase } from './use-cases/delete-ministry-assignment.use-case';

@Controller('ministries')
@UseGuards(JwtAuthGuard) // Removing MinistryRolesGuard since we enforce it via MinistryPolicy in UseCases now
export class MinistriesController {
  constructor(
    private readonly getMinistriesUseCase: GetMinistriesUseCase,
    private readonly createMinistryUseCase: CreateMinistryUseCase,
    private readonly getMinistryUseCase: GetMinistryUseCase,
    private readonly updateMinistryUseCase: UpdateMinistryUseCase,
    private readonly deleteMinistryUseCase: DeleteMinistryUseCase,
    private readonly addMinistryMemberUseCase: AddMinistryMemberUseCase,
    private readonly updateMinistryMemberRoleUseCase: UpdateMinistryMemberRoleUseCase,
    private readonly deleteMinistryMemberUseCase: DeleteMinistryMemberUseCase,
    private readonly getMinistryTasksUseCase: GetMinistryTasksUseCase,
    private readonly createMinistryTaskUseCase: CreateMinistryTaskUseCase,
    private readonly updateMinistryTaskUseCase: UpdateMinistryTaskUseCase,
    private readonly deleteMinistryTaskUseCase: DeleteMinistryTaskUseCase,
    private readonly getMinistryEventsUseCase: GetMinistryEventsUseCase,
    private readonly createMinistryEventUseCase: CreateMinistryEventUseCase,
    private readonly updateMinistryEventUseCase: UpdateMinistryEventUseCase,
    private readonly deleteMinistryEventUseCase: DeleteMinistryEventUseCase,
    private readonly getMeetingNoteUseCase: GetMeetingNoteUseCase,
    private readonly createOrUpdateMeetingNoteUseCase: CreateOrUpdateMeetingNoteUseCase,
    private readonly getAllServiceDutiesUseCase: GetAllServiceDutiesUseCase,
    private readonly getServiceDutiesUseCase: GetServiceDutiesUseCase,
    private readonly createServiceDutyUseCase: CreateServiceDutyUseCase,
    private readonly deleteServiceDutyUseCase: DeleteServiceDutyUseCase,
    private readonly getMinistryAssignmentsUseCase: GetMinistryAssignmentsUseCase,
    private readonly createMinistryAssignmentsUseCase: CreateMinistryAssignmentsUseCase,
    private readonly deleteMinistryAssignmentUseCase: DeleteMinistryAssignmentUseCase,
  ) { }

  @Get()
  @RequirePermissions(AppPermission.MINISTRY_VIEW)
  findAll(@CurrentChurch() churchId: string) {
    return this.getMinistriesUseCase.execute(churchId);
  }

  @Post()
  @RequirePermissions(AppPermission.MINISTRY_MANAGE)
  create(@CurrentChurch() churchId: string, @Body() body: CreateMinistryDto) {
    return this.createMinistryUseCase.execute(churchId, body);
  }

  @Get(':id')
  @RequirePermissions(AppPermission.MINISTRY_VIEW)
  findOne(@Param('id') id: string) {
    return this.getMinistryUseCase.execute(id);
  }

  @Put(':id')
  @RequirePermissions(AppPermission.MINISTRY_MANAGE)
  @RequireMinistryRole(MinistryRole.LEADER, MinistryRole.COORDINATOR)
  update(
    @Param('id') id: string,
    @Request() req: any,
    @CurrentChurch() churchId: string,
    @Body() body: UpdateMinistryDto
  ) {
    return this.updateMinistryUseCase.execute(
      id,
      churchId,
      body,
      req.user.personId,
      req.user.systemRole,
      req.user.functionalRole
    );
  }

  // --- MEMBERS ---

  @Post(':id/members')
  @RequirePermissions(AppPermission.MINISTRY_MANAGE)
  @RequireMinistryRole(MinistryRole.LEADER)
  addMember(
    @Param('id') id: string,
    @Request() req: any,
    @CurrentChurch() churchId: string,
    @Body() body: { memberId: string; role: MinistryRole }
  ) {
    return this.addMinistryMemberUseCase.execute(
      id,
      body.memberId,
      body.role,
      churchId,
      req.user.personId,
      req.user.systemRole,
      req.user.functionalRole
    );
  }

  @Patch(':id/members/:memberId')
  @RequirePermissions(AppPermission.MINISTRY_MANAGE)
  @RequireMinistryRole(MinistryRole.LEADER)
  updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Request() req: any,
    @CurrentChurch() churchId: string,
    @Body() body: { role: MinistryRole }
  ) {
    return this.updateMinistryMemberRoleUseCase.execute(
      id,
      memberId,
      body.role,
      churchId,
      req.user.personId,
      req.user.systemRole,
      req.user.functionalRole
    );
  }

  @Delete(':id/members/:memberId')
  @RequirePermissions(AppPermission.MINISTRY_MANAGE)
  @RequireMinistryRole(MinistryRole.LEADER)
  removeMember(
    @Param('id') id: string,
    @Request() req: any,
    @CurrentChurch() churchId: string,
    @Param('memberId') memberId: string
  ) {
    return this.deleteMinistryMemberUseCase.execute(
      id,
      memberId,
      churchId,
      req.user.personId,
      req.user.systemRole,
      req.user.functionalRole
    );
  }

  // --- EVENTS ---

  @Get(':id/events')
  @RequirePermissions(AppPermission.MINISTRY_VIEW)
  getEvents(@Param('id') id: string) {
    return this.getMinistryEventsUseCase.execute(id);
  }

  @Post(':id/events')
  @RequirePermissions(AppPermission.MINISTRY_EVENT_MANAGE)
  @RequireMinistryRole(MinistryRole.LEADER, MinistryRole.COORDINATOR)
  createEvent(
    @Param('id') id: string,
    @Request() req: any,
    @CurrentChurch() churchId: string,
    @Body() body: CreateMinistryEventDto,
  ) {
    return this.createMinistryEventUseCase.execute(
      id,
      req.user.personId,
      churchId,
      body,
      req.user.systemRole,
      req.user.functionalRole
    );
  }

  @Patch(':id/events/:eventId')
  @RequirePermissions(AppPermission.MINISTRY_EVENT_MANAGE)
  @RequireMinistryRole(MinistryRole.LEADER, MinistryRole.COORDINATOR)
  updateEvent(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Request() req: any,
    @CurrentChurch() churchId: string,
    @Body() body: Partial<CreateMinistryEventDto>,
  ) {
    return this.updateMinistryEventUseCase.execute(
      id,
      eventId,
      req.user.personId,
      churchId,
      body,
      req.user.systemRole,
      req.user.functionalRole
    );
  }

  @Delete(':id/events/:eventId')
  @RequirePermissions(AppPermission.MINISTRY_EVENT_MANAGE)
  @RequireMinistryRole(MinistryRole.LEADER, MinistryRole.COORDINATOR)
  deleteEvent(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Request() req: any,
    @CurrentChurch() churchId: string,
  ) {
    return this.deleteMinistryEventUseCase.execute(
      id,
      eventId,
      req.user.personId,
      churchId,
      req.user.systemRole,
      req.user.functionalRole
    );
  }

  // --- TASKS ---

  @Get(':id/tasks')
  @RequirePermissions(AppPermission.MINISTRY_VIEW)
  getTasks(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.getMinistryTasksUseCase.execute(id, pageNum, limitNum, status);
  }

  @Post(':id/tasks')
  @RequirePermissions(AppPermission.MINISTRY_MANAGE)
  @RequireMinistryRole(MinistryRole.LEADER, MinistryRole.COORDINATOR)
  createTask(
    @Param('id') id: string,
    @Request() req: any,
    @CurrentChurch() churchId: string,
    @Body() body: CreateMinistryTaskDto
  ) {
    return this.createMinistryTaskUseCase.execute(
      id,
      body,
      churchId,
      req.user.personId,
      req.user.systemRole,
      req.user.functionalRole
    );
  }

  @Patch(':id/tasks/:taskId')
  @RequirePermissions(AppPermission.MINISTRY_MANAGE)
  // No @RequireMinistryRole here. It depends on assignment dynamically in the service.
  updateTask(
    @Param('taskId') taskId: string,
    @Body() body: UpdateMinistryTaskDto,
    @Request() req: any
  ) {
    return this.updateMinistryTaskUseCase.execute(
      taskId,
      body,
      req.user.personId,
      req.user.systemRole,
      req.user.functionalRole
    );
  }

  @Delete(':id/tasks/:taskId')
  @RequirePermissions(AppPermission.MINISTRY_MANAGE)
  @RequireMinistryRole(MinistryRole.LEADER, MinistryRole.COORDINATOR)
  deleteTask(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Request() req: any,
    @CurrentChurch() churchId: string
  ) {
    return this.deleteMinistryTaskUseCase.execute(
      id,
      taskId,
      churchId,
      req.user.personId,
      req.user.systemRole,
      req.user.functionalRole
    );
  }

  // --- NOTES ---

  @Get('events/:eventId/notes')
  @RequirePermissions(AppPermission.MINISTRY_VIEW)
  getNote(@Param('eventId') eventId: string) {
    return this.getMeetingNoteUseCase.execute(eventId);
  }

  @Post(':id/events/:eventId/notes')
  @RequirePermissions(AppPermission.MINISTRY_EVENT_MANAGE)
  @RequireMinistryRole(MinistryRole.LEADER, MinistryRole.COORDINATOR)
  createOrUpdateNote(
    @Param('id') ministryId: string,
    @Param('eventId') eventId: string,
    @Request() req: any,
    @CurrentChurch() churchId: string,
    @Body() body: CreateOrUpdateMeetingNoteDto,
  ) {
    return this.createOrUpdateMeetingNoteUseCase.execute(
      eventId,
      req.user.personId,
      churchId,
      ministryId,
      body,
      req.user.systemRole,
      req.user.functionalRole
    );
  }
  // --- SERVICE DUTIES CONFIGURATION ---

  @Get('duties/all') // Global for template editor
  @RequirePermissions(AppPermission.MINISTRY_VIEW)
  getAllServiceDuties(@CurrentChurch() churchId: string) {
    return this.getAllServiceDutiesUseCase.execute(churchId);
  }

  @Get(':id/duties')
  @RequirePermissions(AppPermission.MINISTRY_VIEW)
  getServiceDuties(@Param('id') id: string) {
    return this.getServiceDutiesUseCase.execute(id);
  }

  @Post(':id/duties')
  @RequirePermissions(AppPermission.MINISTRY_MANAGE)
  @RequireMinistryRole(MinistryRole.LEADER, MinistryRole.COORDINATOR)
  createServiceDuty(
    @Param('id') id: string,
    @Request() req: any,
    @CurrentChurch() churchId: string,
    @Body() body: CreateServiceDutyDto,
  ) {
    return this.createServiceDutyUseCase.execute(
      id,
      body.name,
      body.behaviorType,
      churchId,
      req.user.personId,
      req.user.systemRole,
      req.user.functionalRole
    );
  }

  @Delete(':id/duties/:dutyId')
  @RequirePermissions(AppPermission.MINISTRY_MANAGE)
  @RequireMinistryRole(MinistryRole.LEADER, MinistryRole.COORDINATOR)
  deleteServiceDuty(
    @Param('id') id: string,
    @Param('dutyId') dutyId: string,
    @Request() req: any,
    @CurrentChurch() churchId: string
  ) {
    return this.deleteServiceDutyUseCase.execute(
      id,
      dutyId,
      churchId,
      req.user.personId,
      req.user.systemRole,
      req.user.functionalRole
    );
  }

  // --- MEMBER MANAGEMENT --


  // --- SCHEDULE & ASSIGNMENTS ---

  @Get(':id/schedule')
  @RequirePermissions(AppPermission.MINISTRY_VIEW)
  getAssignments(
    @Param('id') id: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.getMinistryAssignmentsUseCase.execute(id, from, to);
  }

  @Post(':id/schedule')
  @RequirePermissions(AppPermission.MINISTRY_MANAGE)
  @RequireMinistryRole(MinistryRole.LEADER, MinistryRole.COORDINATOR)
  createAssignments(
    @Param('id') id: string,
    @Request() req: any,
    @CurrentChurch() churchId: string,
    @Body() body: CreateMinistryAssignmentsDto,
  ) {
    return this.createMinistryAssignmentsUseCase.execute(
      id,
      body.assignments,
      churchId,
      req.user.personId,
      req.user.systemRole,
      req.user.functionalRole
    );
  }

  @Delete(':id/schedule/:assignmentId')
  @RequirePermissions(AppPermission.MINISTRY_MANAGE)
  @RequireMinistryRole(MinistryRole.LEADER, MinistryRole.COORDINATOR)
  deleteAssignment(
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
    @Request() req: any,
    @CurrentChurch() churchId: string
  ) {
    return this.deleteMinistryAssignmentUseCase.execute(
      id,
      assignmentId,
      churchId,
      req.user.personId,
      req.user.systemRole,
      req.user.functionalRole
    );
  }
}
