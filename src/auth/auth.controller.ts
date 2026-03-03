import {
  Body,
  Controller,
  Post,
  UseGuards,
  Get,
  Request,
  Res,
  Param,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import {
  RegisterChurchDto,
  JoinChurchDto,
  LoginDto,
  RegisterUserDto,
} from './dto/dto';
import { SocialLoginDto } from './dto/social-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
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

  @Post('join-church')
  joinChurch(@Body() dto: JoinChurchDto) {
    return this.authService.joinChurch(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('social-login')
  socialLogin(@Body() dto: SocialLoginDto) {
    return this.authService.validateSocialUser(dto);
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
    @Body() body: { personId?: string; createNew: boolean },
  ) {
    return this.authService.claimProfile(
      req.user.userId,
      body.personId,
      body.createNew,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    const user = await this.usersService.findOne(req.user.userId);
    // Ensure we return what the frontend expects, merging with potentially active church info from token if needed,
    // but primarily the user entity with person relation.
    return {
      ...user,
      fullName: user.person?.fullName,
      avatarUrl: user.person?.avatarUrl,
      churchId: req.user.churchId,
      memberId: req.user.memberId,
      ecclesiasticalRole: req.user.ecclesiasticalRole,
      roles: req.user.roles,
    };
  }
}
