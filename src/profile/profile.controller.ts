import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SecurityContextGuard } from '../auth/guards/security-context.guard';
import { CurrentUser } from '../common/decorators';
import { SecurityContext } from '../auth/security-context.interface';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('profile')
@UseGuards(JwtAuthGuard, SecurityContextGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  getProfile(@CurrentUser() securityContext: SecurityContext) {
    return this.profileService.getProfile(securityContext.userId);
  }

  @Patch('me')
  updateProfile(
    @CurrentUser() securityContext: SecurityContext,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(securityContext.userId, dto);
  }

  @Post('change-password')
  changePassword(
    @CurrentUser() securityContext: SecurityContext,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.profileService.changePassword(securityContext.userId, dto);
  }
}

