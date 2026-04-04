import {
  Body,
  Controller,
  Post,
  UseGuards,
  Get,
  Request,
  Param,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import {
  RegisterChurchDto,
  LoginDto,
  RegisterUserDto,
} from './dto/dto';
import { SocialLoginDto } from './dto/social-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChurchPerson } from '../members/entities/church-person.entity';
import { JoinRequest, JoinRequestStatus } from '../members/entities/join-request.entity';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    @InjectRepository(ChurchPerson)
    private memberRepository: Repository<ChurchPerson>,
    @InjectRepository(JoinRequest)
    private joinRequestRepository: Repository<JoinRequest>,
  ) { }

  @Post('register-church')
  registerChurch(@Body() dto: RegisterChurchDto) {
    return this.authService.registerChurch(dto);
  }

  @Post('register-founder')
  registerFounder(@Body() dto: RegisterChurchDto) {
    return this.authService.registerChurch(dto);
  }

  @Post('register')
  register(@Body() dto: RegisterUserDto) {
    return this.authService.registerUser(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('social-login')
  socialLogin(@Body() dto: SocialLoginDto) {
    return this.authService.validateSocialUser(dto);
  }

  @Post('verify-email')
  verifyEmail(@Body() body: { email: string; code: string }) {
    return this.authService.verifyEmail(body.email, body.code);
  }

  @Post('resend-code')
  resendVerificationCode(@Body() body: { email: string }) {
    return this.authService.resendVerificationCode(body.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('switch-church/:churchId')
  switchChurch(@Request() req, @Param('churchId') churchId: string) {
    return this.authService.switchChurch(req.user.userId, churchId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('claim-profile')
  claimProfile(
    @Request() req,
    @Body() body: { personId?: string; createNew: boolean; avatarUrl?: string },
  ) {
    return this.authService.claimProfile(
      req.user.userId,
      body.personId,
      body.createNew,
      body.avatarUrl,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    // 1. Get fresh user from DB
    const user = await this.usersService.findOne(req.user.userId);

    // 2. Find active membership (ChurchPerson)
    let membership: ChurchPerson | null = null;
    if (user.person) {
      membership = await this.memberRepository.findOne({
        where: { person: { id: user.person.id } },
        relations: ['church'],
        order: { joinedAt: 'DESC' },
      });
    }

    // 3. Find pending/rejected join request
    let joinRequest: JoinRequest | null = null;
    if (!membership) {
      joinRequest = await this.joinRequestRepository.findOne({
        where: { userId: user.id },
        order: { createdAt: 'DESC' },
      });
    }

    // 4. Calculate onboardingState (strict priority order)
    let onboardingState: string;

    if (user.systemRole === 'ADMIN_APP') {
      onboardingState = 'ADMIN_APP';
    } else if (!user.isEmailVerified) {
      onboardingState = 'EMAIL_NOT_VERIFIED';
    } else if (joinRequest?.status === JoinRequestStatus.PENDING) {
      onboardingState = 'PENDING';
    } else if (joinRequest?.status === JoinRequestStatus.REJECTED) {
      onboardingState = 'REJECTED';
    } else if (!membership) {
      onboardingState = 'NO_CHURCH';
    } else {
      onboardingState = 'ACTIVE';
    }

    // 5. Return ONLY DB-derived data (NO req.user fallbacks)
    return {
      id: user.id,
      email: user.email,
      fullName: `${user.person?.firstName || ''} ${user.person?.lastName || ''}`.trim() || 'S/N',
      avatarUrl: user.person?.avatarUrl,
      personId: user.person?.id,
      systemRole: user.systemRole,
      isEmailVerified: user.isEmailVerified,
      provider: user.provider,
      // Membership data (only if active member)
      churchId: membership?.churchId || null,
      memberId: membership?.id || null,
      membershipStatus: membership?.membershipStatus || null,
      ecclesiasticalRole: membership?.ecclesiasticalRole || null,
      roles: membership?.functionalRoles || [],
      // Computed state
      onboardingState,
    };
  }
}
