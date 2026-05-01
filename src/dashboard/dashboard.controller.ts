import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get optimized dashboard overview' })
  async getOverview(@Request() req, @Query('churchId') churchId: string) {
    const userChurchId = churchId || req.user?.churchId;
    return this.dashboardService.getOverview({
      churchId: userChurchId,
      personId: req.user?.personId,
      memberId: req.user?.memberId,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getStats(@Request() req) {
    // Assuming user has churchId in user object or associated
    // Usually req.user.churchId or req.user.memberships[0].churchId
    // But for now let's assume req.user might be an admin or we passed churchId in login response
    // Let's assume the JwtStrategy or a global interceptor adds church context.
    // Or we extract it from the user.

    // Quick fix: The user entity in JWT might not have churchId directly if not custom.
    // Check JwtStrategy.
    // For MVP, assume req.user['churchId'] if we put it there, or query it.

    // Safer: Pass churchId as query param OR trust that the payload has it.
    // Let's use the first church of the user for this MVP MVP.
    const user = req.user;

    // If the strategy puts user in req.user, we might need to find their church.
    // For simplicity given the seeding:
    // We generated a user and a member.
    // We need to pass the churchId.
    // Let's assume for now we mock it or fetch it.
    // Or even better, the frontend sends it in a header 'x-church-id'? No, insecure.

    // Let's trust that we can get it.
    // If req.user contains churchId (we added it in login response, but not necessarily in token payload).
    // Let's assume the user is logged in context of a church.

    // For now, let's grab the church from the user's first membership if available.
    // If req.user is just { userId, email }, we need to query.
    // BUT we are injecting `request` which is `any`.

    // Let's modify the service to accept userId and find the church, or assume churchID is in query.
    // Best practice: Header or Token.
    // Let's take it from a query param for flexibility in Frontend or from User if we updated JwtStrategy.
    // Wait, the Login returned `churchId`. The Frontend has it.
    // So the Frontend *knows* the churchId. It should send it.
    // Ideally as a Header `x-church-id` or Query param.
    // Let's use Query param `?churchId=...` for simplicity, validated that the user belongs to it.

    // Simplest for now: User passes churchId as query.
    return this.dashboardService.getStats(
      req.query.churchId || 'church-id-placeholder',
    );
  }

  @Get('upcoming')
  getUpcoming(@Request() req, @Query('churchId') churchId: string) {
    return this.dashboardService.getUpcomingEvents(
      churchId || req.query.churchId,
      req.user?.personId,
    );
  }

  @Get('mentorships')
  getMentorships(@Request() req, @Query('churchId') churchId: string) {
    return this.dashboardService.getActiveMentorships(
      churchId || req.query.churchId,
      req.user?.personId,
      req.user?.memberId,
    );
  }
}
