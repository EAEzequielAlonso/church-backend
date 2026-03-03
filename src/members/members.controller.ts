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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

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
    // Public endpoint for authenticated users to request access
    return this.membersService.requestJoin(
      req.user.userId,
      req.user.personId,
      churchId,
    );
  }

  @Get('search')
  @RequirePermissions(AppPermission.MEMBER_VIEW)
  @ApiOperation({ summary: 'Search members' })
  search(@CurrentChurch() churchId: string, @Query('q') query: string) {
    return this.membersService.search(churchId, query);
  }

  @Get()
  @RequirePermissions(AppPermission.MEMBER_VIEW)
  @ApiOperation({ summary: 'List all members' })
  @ApiQuery({ name: 'status', enum: MembershipStatus, required: false })
  findAll(
    @CurrentChurch() churchId: string,
    @Query('status') status?: MembershipStatus,
  ) {
    return this.membersService.findAll(churchId, status);
  }

  @Get(':id')
  @RequirePermissions(AppPermission.MEMBER_VIEW)
  @ApiOperation({ summary: 'Get a member' })
  findOne(@Param('id') id: string, @CurrentChurch() churchId: string) {
    return this.membersService.findOne(id, churchId);
  }

  @Get(':id/details')
  @RequirePermissions(AppPermission.MEMBER_VIEW)
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

  @Delete(':id')
  @RequirePermissions(AppPermission.MEMBER_DELETE)
  @ApiOperation({ summary: 'Remove a member' })
  remove(@Param('id') id: string, @CurrentChurch() churchId: string) {
    return this.membersService.remove(id, churchId);
  }
}
