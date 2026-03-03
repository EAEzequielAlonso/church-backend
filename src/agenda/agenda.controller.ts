import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AgendaService } from './agenda.service';

@Controller('agenda')
@UseGuards(JwtAuthGuard)
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Get()
  async getMyAgenda(@Request() req, @Query('historical') historical?: string) {
    const userId = req.user.userId;
    const personId = req.user.personId;
    const memberId = req.user.memberId;
    const churchId = req.user.churchId;

    return this.agendaService.getUpcomingActivities(
      personId,
      memberId,
      churchId,
      historical === 'true',
    );
  }

  @Post()
  async createEvent(@Request() req, @Body() createDto: CreateCalendarEventDto) {
    const { personId, memberId, churchId, permissions, roles } = req.user;
    return this.agendaService.createEvent(
      createDto,
      personId,
      churchId,
      permissions || [],
      roles || [],
      memberId,
    );
  }

  @Patch(':id')
  async updateEvent(
    @Param('id') id: string,
    @Request() req,
    @Body() updateDto: any,
  ) {
    const { personId, roles } = req.user;
    return this.agendaService.updateEvent(id, updateDto, personId, roles || []);
  }

  @Delete(':id')
  async deleteEvent(@Param('id') id: string, @Request() req) {
    const { personId, roles } = req.user;
    return this.agendaService.deleteEvent(id, personId, roles || []);
  }
}
