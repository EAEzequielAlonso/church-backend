import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  UnauthorizedException,
  Get,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { ChurchNeedSignalsService } from '../services/church-need-signals.service';
import { CreateChurchNeedSignalDto } from '../dto/church-need-signals/create-church-need-signal.dto';
import { AddNeedInformationDto } from '../dto/church-need-signals/add-need-information.dto';
import { ChurchNeedSignalFilterDto } from '../dto/church-need-signals/church-need-signal-filter.dto';
import { InformationFilterDto } from '../dto/church-need-signals/information-filter.dto';
import { ChurchNeedSignalResponseDto } from '../dto/church-need-signals/church-need-signal-response.dto';

@Controller('public/church-need-signals')
export class ChurchNeedSignalsController {
  constructor(
    private readonly churchNeedSignalsService: ChurchNeedSignalsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createSignal(@Req() req: any, @Body() dto: CreateChurchNeedSignalDto) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    return this.churchNeedSignalsService.createSignal(personId, dto);
  }

  @Post(':id/support')
  @UseGuards(JwtAuthGuard)
  async supportSignal(@Req() req: any, @Param('id') id: string) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    return this.churchNeedSignalsService.supportSignal(personId, id);
  }

  @Get()
  async listSignals(@Query() filterDto: ChurchNeedSignalFilterDto) {
    const result = await this.churchNeedSignalsService.listSignals(filterDto);
    return {
      ...result,
      items: result.items.map((i) => ChurchNeedSignalResponseDto.fromEntity(i)),
    };
  }

  @Get(':id')
  async getSignalDetail(@Param('id') id: string) {
    const detail = await this.churchNeedSignalsService.getSignalDetail(id);
    // detail contains the entity properties plus supportCount and recentInformation
    return ChurchNeedSignalResponseDto.fromEntity(
      detail as any,
      detail.supportCount,
      detail.recentInformation,
    );
  }

  @Get(':id/map-summary')
  async mapSummary(@Param('id') id: string) {
    const result = await this.churchNeedSignalsService.mapSummary(id);
    if (!result) throw new NotFoundException('Church Need Signal not found');
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
    return this.churchNeedSignalsService.addInformation(personId, id, dto);
  }

  @Get(':id/information')
  async listInformation(
    @Param('id') id: string,
    @Query() filterDto: InformationFilterDto,
  ) {
    return this.churchNeedSignalsService.listInformation(id, filterDto);
  }
}
