import {
  Body,
  Controller,
  Post,
  UseGuards,
  Get,
  Request,
  Param,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import {
  RegisterChurchDto,
  LoginDto,
  RegisterUserDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/dto';
import { SocialLoginDto } from './dto/social-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  EcosystemContributionsService,
  VisibleContributions,
} from '../../public/ecosystem/services/ecosystem-contributions.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private contributionsService: EcosystemContributionsService,
  ) {}

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

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Get('reset-password/validate')
  validateResetToken(@Query('token') token: string) {
    return this.authService.validateResetToken(token);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
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
    const sessionUser = {
      id: user.id,
      email: user.email,
      firstName: user.person?.firstName || 'Usuario',
      lastName: user.person?.lastName || '',
      avatarUrl: user.person?.avatarUrl || null,
      systemRole: user.systemRole,
      isEmailVerified: user.isEmailVerified,
      isOnboarded: user.isOnboarded,
      hasLocation: !!(
        user.person?.country &&
        user.person?.state &&
        user.person?.city
      ),
      provider: user.provider,
    };

    return sessionUser;
  }
}
