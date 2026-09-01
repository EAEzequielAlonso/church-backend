import { Controller, Patch, Get, Body, UseGuards, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SecurityContextGuard } from '../auth/guards/security-context.guard';
import { CurrentUser } from '../../common/decorators';
import { SecurityContext } from '../auth/security-context.interface';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';
import { EcosystemContributionsService } from '../../public/ecosystem/services/ecosystem-contributions.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly contributionsService: EcosystemContributionsService,
  ) {}

  @UseGuards(JwtAuthGuard, SecurityContextGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get user profile' })
  async getProfile(@CurrentUser() securityContext: SecurityContext) {
    const user = await this.usersService.findOne(securityContext.userId);
    const p = user.person;
    if (!p) return {};

    return UserProfileResponseDto.fromPerson(p);
  }

  @UseGuards(JwtAuthGuard, SecurityContextGuard)
  @Get('network-impact')
  @ApiOperation({ summary: 'Get user network impact' })
  async getNetworkImpact(@CurrentUser() securityContext: SecurityContext) {
    const user = await this.usersService.findOne(securityContext.userId);
    if (!user.person?.id) {
      return {
        churchesAdded: 0,
        successfulClaims: 0,
        invitedBelievers: 0,
        approvedCorrections: 0,
        validatedChurches: 0,
      };
    }
    return this.contributionsService.getAggregatedContributionsForPerson(
      user.person.id,
    );
  }

  @UseGuards(JwtAuthGuard, SecurityContextGuard)
  @Get('workspaces')
  @ApiOperation({ summary: 'Get user workspaces (churches)' })
  async getWorkspaces(@CurrentUser() securityContext: SecurityContext) {
    if (!securityContext.personId) return [];
    return this.usersService.getWorkspaces(securityContext.personId);
  }

  @UseGuards(JwtAuthGuard, SecurityContextGuard)
  @Get('profile/slug-availability')
  @ApiOperation({ summary: 'Check if a slug is available' })
  async checkSlugAvailability(
    @CurrentUser() securityContext: SecurityContext,
    @Query('slug') slug: string,
  ) {
    if (!slug) return { available: false };
    const available = await this.usersService.isSlugAvailable(
      slug,
      securityContext.userId,
    );
    return { available };
  }

  @UseGuards(JwtAuthGuard, SecurityContextGuard)
  @Patch('profile')
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(
    @CurrentUser() securityContext: SecurityContext,
    @Body() dto: UpdateProfileDto,
  ) {
    const user = await this.usersService.updateProfile(
      securityContext.userId,
      dto,
    );
    return user.person ? UserProfileResponseDto.fromPerson(user.person) : {};
  }
}
