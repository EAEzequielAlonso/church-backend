import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DonationsService } from './donations.service';
import { CreateDonationPreferenceDto } from './dto/create-donation-preference.dto';

@Controller('donations')
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('preference')
  async createPreference(
    @Request() req,
    @Body() dto: CreateDonationPreferenceDto,
  ) {
    const userId = req.user.userId;
    return this.donationsService.createPreference(userId, dto);
  }
}
