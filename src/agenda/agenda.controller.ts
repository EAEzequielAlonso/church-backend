import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SecurityContextGuard } from '../auth/guards/security-context.guard';
import { AgendaService } from './agenda.service';
import { CurrentChurch, CurrentUser } from '../common/decorators';
import { SecurityContext } from '../auth/security-context.interface';

import { SubscriptionGuard } from '../subscriptions/guards/subscription.guard';

@Controller('agenda')
@UseGuards(JwtAuthGuard, SecurityContextGuard, SubscriptionGuard)
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Get()
  async getMyAgenda(
    @CurrentUser() securityContext: SecurityContext,
    @CurrentChurch() churchId: string,
    @Query('historical') historical?: string,
    @Query('limit') limit?: string,
  ) {
    return this.agendaService.getUpcomingActivities(
      securityContext.personId,
      securityContext.churchPersonId,
      churchId,
      historical === 'true',
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Post()
  async createEvent(
    @CurrentUser() securityContext: SecurityContext,
    @CurrentChurch() churchId: string,
    @Body() createDto: CreateCalendarEventDto,
  ) {
    return this.agendaService.createEvent(
      createDto,
      securityContext.personId,
      churchId,
      securityContext.permissions || [],
      securityContext.functionalRoles || [],
      securityContext.churchPersonId,
    );
  }

  @Patch(':id')
  async updateEvent(
    @Param('id') id: string,
    @CurrentUser() securityContext: SecurityContext,
    @Body() updateDto: any,
  ) {
    return this.agendaService.updateEvent(
      id,
      updateDto,
      securityContext.personId,
      securityContext.functionalRoles || [],
    );
  }

  @Delete(':id')
  async deleteEvent(
    @Param('id') id: string,
    @CurrentUser() securityContext: SecurityContext,
  ) {
    return this.agendaService.deleteEvent(
      id,
      securityContext.personId,
      securityContext.functionalRoles || [],
    );
  }
}

