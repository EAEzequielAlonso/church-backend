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
  Request,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AppPermission } from '../auth/authorization/permissions.enum';
import { CurrentChurch } from '../common/decorators';
import { MembershipStatus } from './enums/membership-status.enum';
import { ApproveMemberDto } from './dto/approve-member.dto';
import { FunctionalRole } from '../common/enums';

import { SubscriptionGuard } from '../subscriptions/guards/subscription.guard';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionGuard)
@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) { }

  @Post()
  @RequirePermissions(AppPermission.MEMBER_CREATE)
  @ApiOperation({ summary: 'Create a new member' })
  create(
    @Body() createMemberDto: CreateMemberDto,
    @CurrentChurch() churchId: string,
  ) {
    return this.membersService.create(createMemberDto, churchId);
  }

  @Post('request-access')
  @ApiOperation({ summary: 'Request to join a church' })
  requestAccess(@Body('churchId') churchId: string, @Request() req) {
    return this.membersService.requestJoin(
      req.user.userId,
      churchId,
    );
  }

  @Get('search')
  @ApiOperation({ summary: 'Search members' })
  search(@CurrentChurch() churchId: string, @Query('q') query: string) {
    return this.membersService.search(churchId, query);
  }

  @Get()
  @ApiOperation({ summary: 'List all members' })
  @ApiQuery({ name: 'status', enum: MembershipStatus, required: false })
  @ApiQuery({ name: 'role', enum: FunctionalRole, required: false })
  findAll(
    @CurrentChurch() churchId: string,
    @Query('status') status?: MembershipStatus,
    @Query('role') role?: FunctionalRole,
  ) {
    return this.membersService.findAll(churchId, status, role);
  }

  @Get('pending')
  @RequirePermissions(AppPermission.MEMBER_UPDATE)
  @ApiOperation({ summary: 'Get pending join requests' })
  getPendingRequests(@CurrentChurch() churchId: string) {
    return this.membersService.getPendingRequests(churchId);
  }

  @Get(':id')
  @RequirePermissions(AppPermission.MEMBER_UPDATE)
  @ApiOperation({ summary: 'Get a member' })
  findOne(@Param('id') id: string, @CurrentChurch() churchId: string) {
    return this.membersService.findOne(id, churchId);
  }

  @Get(':id/details')
  @RequirePermissions(AppPermission.MEMBER_UPDATE)
  @ApiOperation({ summary: 'Get member detailed info' })
  getMemberDetails(@Param('id') id: string, @CurrentChurch() churchId: string) {
    return this.membersService.getMemberDetails(id, churchId);
  }

  @Patch(':id')
  @RequirePermissions(AppPermission.MEMBER_UPDATE)
  @ApiOperation({ summary: 'Update a member' })
  update(
    @Param('id') id: string,
    @Body() updateData: any,
    @CurrentChurch() churchId: string,
    @Request() req,
  ) {
    return this.membersService.update(
      id,
      updateData,
      churchId,
      req.user?.memberId,
    );
  }

  @Post(':id/approve')
  @RequirePermissions(AppPermission.MEMBER_UPDATE)
  @ApiOperation({ summary: 'Approve a pending join request' })
  approve(
    @Param('id') joinRequestId: string,
    @CurrentChurch() churchId: string,
    @Body() approveMemberDto: ApproveMemberDto,
  ) {
    return this.membersService.approveMember(joinRequestId, churchId, approveMemberDto);
  }

  @Post(':id/reject')
  @RequirePermissions(AppPermission.MEMBER_UPDATE)
  @ApiOperation({ summary: 'Reject a pending join request' })
  reject(@Param('id') joinRequestId: string, @CurrentChurch() churchId: string) {
    return this.membersService.rejectMember(joinRequestId, churchId);
  }

  @Post(':id/invite')
  @RequirePermissions(AppPermission.MEMBER_UPDATE)
  @ApiOperation({ summary: 'Send invitation link to a member' })
  invite(@Param('id') id: string, @CurrentChurch() churchId: string) {
    return this.membersService.inviteMember(id, churchId);
  }

  @Delete(':id')
  @RequirePermissions(AppPermission.MEMBER_DELETE)
  @ApiOperation({ summary: 'Remove a member' })
  remove(@Param('id') id: string, @CurrentChurch() churchId: string) {
    return this.membersService.remove(id, churchId);
  }
}
