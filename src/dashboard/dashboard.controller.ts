import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SecurityContextGuard } from '../auth/guards/security-context.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AppPermission } from '../auth/authorization/permissions.enum';
import { CurrentChurch, CurrentUser } from '../common/decorators';
import { SecurityContext } from '../auth/security-context.interface';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SecurityContextGuard, PermissionsGuard)
@Controller('dashboard')
@RequirePermissions(AppPermission.CHURCH_VIEW)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get optimized dashboard overview' })
  async getOverview(@CurrentChurch() churchId: string, @CurrentUser() securityContext: SecurityContext) {
    return this.dashboardService.getOverview({
      churchId,
      personId: securityContext.personId,
      memberId: securityContext.churchPersonId,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  getStats(@CurrentChurch() churchId: string) {
    return this.dashboardService.getStats(churchId);
  }

  @Get('upcoming')
  getUpcoming(@CurrentChurch() churchId: string, @CurrentUser() securityContext: SecurityContext) {
    return this.dashboardService.getUpcomingEvents(churchId, securityContext.personId);
  }

  @Get('mentorships')
  getMentorships(@CurrentChurch() churchId: string, @CurrentUser() securityContext: SecurityContext) {
    return this.dashboardService.getActiveMentorships(churchId, securityContext.personId, securityContext.churchPersonId);
  }
}
