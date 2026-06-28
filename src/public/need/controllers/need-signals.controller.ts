import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  UnauthorizedException,
  Patch,
  Param,
  Get,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { NeedSignalsService } from '../services/need-signals.service';
import { CreateOrUpdateNeedSignalDto } from '../dto/need-signal.dto'; 
import { AddNeedInformationDto } from '../dto/church-need-signals/add-need-information.dto';
import { InformationFilterDto } from '../dto/church-need-signals/information-filter.dto';
import { NeedSignalResponseDto } from '../dto/need-signal-response.dto';

@Controller('public/need-signals')
export class NeedSignalsController {
  constructor(private readonly needSignalsService: NeedSignalsService) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createOrUpdate(@Req() req: any, @Body() dto: CreateOrUpdateNeedSignalDto) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    return this.needSignalsService.createOrUpdate(personId, dto);
  }

  @Patch(':id/close')
  @UseGuards(JwtAuthGuard)
  async closeSignal(@Req() req: any, @Param('id') id: string) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    return this.needSignalsService.closeSignal(personId, id);
  }

  @Post(':id/contact')
  @UseGuards(JwtAuthGuard)
  async recordContact(@Req() req: any, @Param('id') id: string, @Body() body: { method: string }) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    return this.needSignalsService.recordContactAttempt(personId, id, body.method);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async findMySignals(@Req() req: any) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    const signals = await this.needSignalsService.findMySignals(personId);
    
    // El dominio establece que una persona solamente puede tener una NeedSignal personal activa.
    const activeSignal = signals.find(s => s.status === 'OPEN') || null;
    return activeSignal ? NeedSignalResponseDto.fromEntity(activeSignal) : null;
  }

  @Get('map')
  async getMapSignals() {
    return this.needSignalsService.getMapSignals();
  }

  @Get(':id/map-summary')
  async mapSummary(@Param('id') id: string) {
    const result = await this.needSignalsService.mapSummary(id);
    if (!result) throw new NotFoundException('Need Signal not found');
    return result;
  }

  @Post(':id/information')
  @UseGuards(JwtAuthGuard)
  async addInformation(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: AddNeedInformationDto,
  ) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    return this.needSignalsService.addInformation(personId, id, dto);
  }

  @Get(':id/information')
  async listInformation(
    @Param('id') id: string,
    @Query() filterDto: InformationFilterDto,
  ) {
    return this.needSignalsService.listInformation(id, filterDto);
  }
}
