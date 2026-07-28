import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { EcosystemContributionsService } from '../ecosystem/services/ecosystem-contributions.service';

@ApiTags('Public - Ecosystem Feed')
@Controller('public/ecosystem/feed')
export class EcosystemFeedController {
  constructor(private readonly feedService: EcosystemContributionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get global ecosystem activity feed' })
  async getGlobalFeed(
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
    @Query('churchId') churchId?: string,
  ) {
    const events = await this.feedService.getFeed(
      limit,
      offset,
      undefined,
      churchId,
    );
    return events.map(this.mapToFeedItem);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get personal ecosystem activity feed' })
  async getPersonalFeed(
    @Req() req: Request & { user: { personId: string } },
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
  ) {
    const events = await this.feedService.getFeed(
      limit,
      offset,
      req.user.personId,
    );
    return events.map(this.mapToFeedItem);
  }

  private mapToFeedItem(event: any) {
    return {
      id: event.id,
      type: event.type,
      createdAt: event.createdAt,
      metadata: event.metadata,
      actor: event.actorPerson
        ? {
            id: event.actorPerson.id,
            firstName: event.actorPerson.firstName,
            lastName: event.actorPerson.lastName,
            slug: event.actorPerson.slug,
            avatarUrl: event.actorPerson.avatarUrl,
          }
        : null,
    };
  }
}
