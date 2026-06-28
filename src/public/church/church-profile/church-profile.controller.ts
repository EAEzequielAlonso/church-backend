import { Controller, Get, NotFoundException, Param, UseGuards, Req } from '@nestjs/common';
import { OptionalJwtAuthGuard } from 'src/core/auth/guards/optional-jwt-auth.guard';
import { ChurchProfileService } from './services/church-profile.service';

@Controller('public/churches')
@UseGuards(OptionalJwtAuthGuard)
export class ChurchProfileController {
  constructor(private readonly service: ChurchProfileService) { }
  @Get(':id/map-summary')
  async mapSummary(@Param('id') id: string) {
    const result = await this.service.mapSummary(id);
    if (!result) throw new NotFoundException('Church not found');
    return result;
  }

  @Get(':slug')
  async bySlug(@Param('slug') slug: string, @Req() req: Request & { user?: any }) {
    const result = await this.service.bySlug(slug, req.user?.personId);
    if (!result) throw new NotFoundException('Church not found');
    return result;
  }
}
