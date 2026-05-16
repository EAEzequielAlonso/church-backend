import {
  Controller,
  Patch,
  Get,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SecurityContextGuard } from '../auth/guards/security-context.guard';
import { CurrentUser } from '../common/decorators';
import { SecurityContext } from '../auth/security-context.interface';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard, SecurityContextGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get user profile' })
  getProfile(@CurrentUser() securityContext: SecurityContext) {
    return this.usersService.findOne(securityContext.userId);
  }

  @UseGuards(JwtAuthGuard, SecurityContextGuard)
  @Patch('profile')
  @ApiOperation({ summary: 'Update user profile' })
  updateProfile(
    @CurrentUser() securityContext: SecurityContext,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(securityContext.userId, dto);
  }
}

