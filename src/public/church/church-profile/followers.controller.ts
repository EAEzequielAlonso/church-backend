import {
  Controller,
  Post,
  Delete,
  Param,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { PublicRateLimit } from 'src/core/auth/decorators/public-rate-limit.decorator';
import { FollowersService } from './services/followers.service';

@Controller('public/churches')
@UseGuards(JwtAuthGuard)
export class FollowersController {
  constructor(private readonly service: FollowersService) {}

  @Post(':churchId/follow')
  @UseGuards(PublicRateLimit(20, 60))
  async follow(@Req() req: any, @Param('churchId') churchId: string) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    return this.service.follow(churchId, personId);
  }

  @Delete(':churchId/follow')
  async unfollow(@Req() req: any, @Param('churchId') churchId: string) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    return this.service.unfollow(churchId, personId);
  }
}
