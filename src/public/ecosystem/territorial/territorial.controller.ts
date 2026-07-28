import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { TerritorialService } from './territorial.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';

@Controller('public/territorial')
export class TerritorialController {
  constructor(private readonly territorialService: TerritorialService) {}

  @Get('dashboard')
  async getDashboard() {
    return this.territorialService.getDashboard();
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-zone')
  async getMyZone(@Req() req: any) {
    return this.territorialService.getMyZone(req.user.userId);
  }
}
