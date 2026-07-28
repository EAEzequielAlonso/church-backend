import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { RegisterFromInvitationDto } from './dto/register-from-invitation.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';

@ApiTags('Invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generar una nueva invitación (Requiere JWT)' })
  async createInvitation(@Request() req, @Body() dto: CreateInvitationDto) {
    const inviterPersonId = req.user.personId;
    return this.invitationsService.createInvitation(inviterPersonId, dto);
  }

  @Get(':token')
  @ApiOperation({ summary: 'Consultar datos de una invitación por token' })
  async getInvitation(@Param('token') token: string) {
    return this.invitationsService.getInvitationByToken(token);
  }

  @Post('register')
  @ApiOperation({ summary: 'Registro de usuario consumiendo una invitación' })
  async registerFromInvitation(@Body() dto: RegisterFromInvitationDto) {
    await this.invitationsService.registerFromInvitation(dto);
    return { message: 'Registro e invitación procesados con éxito' };
  }

  @Post(':id/resend')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reenviar una invitación pendiente (Requiere JWT)' })
  async resendInvitation(@Request() req, @Param('id') id: string) {
    const inviterPersonId = req.user.personId;
    return this.invitationsService.resendInvitation(id, inviterPersonId);
  }
}
