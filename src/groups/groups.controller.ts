import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import {
  CreateGroupDto,
  UpdateGroupDto,
  BulkAddParticipantsDto,
} from './dto/groups.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentChurch } from '../common/decorators';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { GroupType } from './enums/group.enums';
import { RegisterAttendanceDto } from './dto/groups.dto';
import { UpdateGroupMaterialsDto } from './dto/group-materials.dto';
import { SubscriptionGuard } from '../subscriptions/guards/subscription.guard';
import { SecurityContextGuard } from '../auth/guards/security-context.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AppPermission } from '../auth/authorization/permissions.enum';
import { CurrentUser } from '../common/decorators';
import { SecurityContext } from '../auth/security-context.interface';

@ApiTags('Groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SecurityContextGuard, PermissionsGuard, SubscriptionGuard)
@Controller('groups')
@RequirePermissions(AppPermission.GROUP_VIEW)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @RequirePermissions(AppPermission.GROUP_CREATE)
  @ApiOperation({ summary: 'Create a new group/course/activity' })
  create(@Body() createGroupDto: CreateGroupDto, @CurrentChurch() churchId: string) {
    return this.groupsService.create(createGroupDto, churchId);
  }

  @Get()
  @ApiOperation({ summary: 'List all groups' })
  @ApiQuery({ name: 'type', enum: GroupType, required: false })
  findAll(@CurrentChurch() churchId: string, @Query('type') type?: GroupType) {
    return this.groupsService.findAll(churchId, type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific group by ID' })
  findOne(@Param('id') id: string, @CurrentChurch() churchId: string) {
    return this.groupsService.findOne(id, churchId);
  }

  @Patch(':id')
  @RequirePermissions(AppPermission.GROUP_UPDATE)
  @ApiOperation({ summary: 'Update a specific group' })
  update(@Param('id') id: string, @Body() updateGroupDto: UpdateGroupDto, @CurrentChurch() churchId: string) {
    return this.groupsService.update(id, updateGroupDto, churchId);
  }

  @Delete(':id')
  @RequirePermissions(AppPermission.GROUP_DELETE)
  @ApiOperation({ summary: 'Delete a group' })
  remove(@Param('id') id: string, @CurrentChurch() churchId: string) {
    return this.groupsService.remove(id, churchId);
  }

  @Post(':id/enroll/:churchPersonId')
  @RequirePermissions(AppPermission.GROUP_MANAGE_MEMBERS)
  @ApiOperation({ summary: 'Enroll a person in a group' })
  enroll(@Param('id') id: string, @Param('churchPersonId') churchPersonId: string, @CurrentChurch() churchId: string) {
    return this.groupsService.enrollParticipant(id, churchPersonId, churchId);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join a public group as the current member' })
  joinAsCurrentMember(
    @Param('id') id: string,
    @CurrentChurch() churchId: string,
    @CurrentUser() securityContext: SecurityContext,
  ) {
    return this.groupsService.joinAsCurrentMember(id, securityContext.churchPersonId, churchId);
  }

  @Delete(':id/participants/:churchPersonId')
  @RequirePermissions(AppPermission.GROUP_MANAGE_MEMBERS)
  @ApiOperation({ summary: 'Remove a person from a group' })
  removeParticipant(@Param('id') id: string, @Param('churchPersonId') churchPersonId: string, @CurrentChurch() churchId: string) {
    return this.groupsService.removeParticipant(id, churchPersonId, churchId);
  }

  @Delete(':id/join')
  @ApiOperation({ summary: 'Leave a group as the current member' })
  leaveAsCurrentMember(
    @Param('id') id: string,
    @CurrentChurch() churchId: string,
    @CurrentUser() securityContext: SecurityContext,
  ) {
    return this.groupsService.leaveAsCurrentMember(id, securityContext.churchPersonId, churchId);
  }

  @Post(':id/participants')
  @RequirePermissions(AppPermission.GROUP_MANAGE_MEMBERS)
  addParticipant(@Param('id') id: string, @Body() body: { churchPersonId: string; role: any }, @CurrentChurch() churchId: string) {
    return this.groupsService.enrollParticipant(id, body.churchPersonId, churchId, body.role);
  }

  @Post(':id/participants/bulk')
  @RequirePermissions(AppPermission.GROUP_MANAGE_MEMBERS)
  bulkAddParticipants(@Param('id') id: string, @Body() dto: BulkAddParticipantsDto, @CurrentChurch() churchId: string) {
    return this.groupsService.bulkAddParticipants(id, dto, churchId);
  }

  @Patch(':id/participants/:churchPersonId/role')
  @RequirePermissions(AppPermission.GROUP_MANAGE_MEMBERS)
  updateParticipantRole(@Param('id') id: string, @Param('churchPersonId') churchPersonId: string, @Body() body: { role: any }, @CurrentChurch() churchId: string) {
    return this.groupsService.updateParticipantRole(id, churchPersonId, churchId, body.role);
  }

  @Patch(':id/materials')
  @RequirePermissions(AppPermission.GROUP_UPDATE)
  @ApiOperation({ summary: 'Update study resources linked to a group' })
  updateMaterials(
    @Param('id') id: string,
    @Body() dto: UpdateGroupMaterialsDto,
    @CurrentChurch() churchId: string,
  ) {
    return this.groupsService.updateMaterials(id, churchId, dto.resourceIds);
  }

  @Post(':id/meetings')
  @RequirePermissions(AppPermission.GROUP_UPDATE)
  createMeeting(@Param('id') id: string, @Body() body: { title?: string; date: string; location?: string; notes?: string }, @CurrentChurch() churchId: string) {
    return this.groupsService.createMeeting(id, churchId, body);
  }

  @Patch(':id/meetings/:meetingId')
  @RequirePermissions(AppPermission.GROUP_UPDATE)
  updateMeeting(@Param('id') id: string, @Param('meetingId') meetingId: string, @Body() body: { title?: string; date?: string; location?: string; notes?: string }, @CurrentChurch() churchId: string) {
    return this.groupsService.updateMeeting(id, meetingId, churchId, body);
  }

  @Delete(':id/meetings/:meetingId')
  @RequirePermissions(AppPermission.GROUP_DELETE)
  deleteMeeting(@Param('id') id: string, @Param('meetingId') meetingId: string, @CurrentChurch() churchId: string) {
    return this.groupsService.deleteMeeting(id, meetingId, churchId);
  }

  @Get(':id/meetings/:meetingId/attendance')
  getMeetingAttendance(@Param('id') id: string, @Param('meetingId') meetingId: string, @CurrentChurch() churchId: string) {
    return this.groupsService.getMeetingAttendance(id, meetingId, churchId);
  }

  @Post(':id/meetings/:meetingId/attendance')
  @RequirePermissions(AppPermission.GROUP_MANAGE_MEMBERS)
  registerAttendance(@Param('id') id: string, @Param('meetingId') meetingId: string, @Body() body: RegisterAttendanceDto, @CurrentChurch() churchId: string) {
    return this.groupsService.registerAttendance(id, meetingId, body, churchId);
  }
}
