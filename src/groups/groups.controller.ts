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
import { CreateGroupDto, UpdateGroupDto } from './dto/groups.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentChurch } from '../common/decorators';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { GroupType } from './enums/group.enums';

@ApiTags('Groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new group/course/activity' })
  create(
    @Body() createGroupDto: CreateGroupDto,
    @CurrentChurch() churchId: string,
  ) {
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
  @ApiOperation({ summary: 'Update a specific group' })
  update(
    @Param('id') id: string,
    @Body() updateGroupDto: UpdateGroupDto,
    @CurrentChurch() churchId: string,
  ) {
    return this.groupsService.update(id, updateGroupDto, churchId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a group' })
  remove(@Param('id') id: string, @CurrentChurch() churchId: string) {
    return this.groupsService.remove(id, churchId);
  }

  @Post(':id/enroll/:churchPersonId')
  @ApiOperation({ summary: 'Enroll a person in a group' })
  enroll(
    @Param('id') id: string,
    @Param('churchPersonId') churchPersonId: string,
    @CurrentChurch() churchId: string,
  ) {
    return this.groupsService.enrollParticipant(id, churchPersonId, churchId);
  }

  @Delete(':id/participants/:churchPersonId')
  @ApiOperation({ summary: 'Remove a person from a group' })
  removeParticipant(
    @Param('id') id: string,
    @Param('churchPersonId') churchPersonId: string,
    @CurrentChurch() churchId: string,
  ) {
    return this.groupsService.removeParticipant(id, churchPersonId, churchId);
  }

  @Post(':id/participants')
  @ApiOperation({
    summary: 'Manually add a participant to a group with a specific role',
  })
  addParticipant(
    @Param('id') id: string,
    @Body() body: { churchPersonId: string; role: any }, // using any for now, ideally GroupRole
    @CurrentChurch() churchId: string,
  ) {
    return this.groupsService.enrollParticipant(
      id,
      body.churchPersonId,
      churchId,
      body.role,
    );
  }

  @Patch(':id/participants/:churchPersonId/role')
  @ApiOperation({ summary: 'Update a participant role in a group' })
  updateParticipantRole(
    @Param('id') id: string,
    @Param('churchPersonId') churchPersonId: string,
    @Body() body: { role: any }, // using any for now, ideally GroupRole
    @CurrentChurch() churchId: string,
  ) {
    return this.groupsService.updateParticipantRole(
      id,
      churchPersonId,
      churchId,
      body.role,
    );
  }

  @Post(':id/meetings')
  @ApiOperation({ summary: 'Register a new meeting/encounter for a group' })
  createMeeting(
    @Param('id') id: string,
    @Body() body: { date: string; location?: string; notes?: string },
    @CurrentChurch() churchId: string,
  ) {
    return this.groupsService.createMeeting(id, churchId, body);
  }
}
