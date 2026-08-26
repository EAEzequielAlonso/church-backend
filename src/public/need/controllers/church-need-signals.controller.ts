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
  Patch,
  Delete,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../../core/auth/guards/optional-jwt-auth.guard';
import { ChurchNeedSignalsService } from '../services/church-need-signals.service';
import { CreateChurchNeedSignalDto } from '../dto/church-need-signals/create-church-need-signal.dto';
import { AddNeedInformationDto } from '../dto/church-need-signals/add-need-information.dto';
import { ChurchNeedSignalFilterDto } from '../dto/church-need-signals/church-need-signal-filter.dto';
import { InformationFilterDto } from '../dto/church-need-signals/information-filter.dto';
import { ChurchNeedSignalResponseDto } from '../dto/church-need-signals/church-need-signal-response.dto';
import { EditChurchNeedSignalDto } from '../dto/church-need-signals/edit-church-need-signal.dto';
import { UpdateChurchNeedSignalStatusDto } from '../dto/church-need-signals/update-church-need-signal-status.dto';
import { ChurchNeedSignalEvaluator } from '../policies/church-need-signals.evaluator';
import { MapViewportDto } from 'src/shared/dtos/map-viewport.dto';

@Controller('public/church-need-signals')
export class ChurchNeedSignalsController {
  constructor(
    private readonly churchNeedSignalsService: ChurchNeedSignalsService,
    private readonly evaluator: ChurchNeedSignalEvaluator,
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
  @UseGuards(OptionalJwtAuthGuard)
  async listSignals(
    @Req() req: any,
    @Query() filterDto: ChurchNeedSignalFilterDto,
  ) {
    const personId = req.user?.personId;
    const result = await this.churchNeedSignalsService.listSignals(
      filterDto,
      personId,
    );
    return {
      ...result,
      items: result.items.map((i: any) => {
        const allowedActions = this.evaluator.getAllowedActions(i, {
          actorId: personId,
          hasSupported: i.hasSupported,
          hasThirdPartyInfo: i.hasThirdPartyInfo,
        });
        return ChurchNeedSignalResponseDto.fromEntity(i, allowedActions);
      }),
    };
  }

  @Get('map')
  async mapMarkers(@Query() viewport: MapViewportDto) {
    return this.churchNeedSignalsService.mapMarkers(viewport);
  }

  @Get(':id/map-summary')
  async mapSummary(@Param('id') id: string) {
    const result = await this.churchNeedSignalsService.mapSummary(id);
    if (!result) throw new NotFoundException('Church Need Signal not found');
    return result;
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async getSignalDetail(@Req() req: any, @Param('id') id: string) {
    const personId = req.user?.personId;
    const detail: any = await this.churchNeedSignalsService.getSignalDetail(
      id,
      personId,
    );

    const allowedActions = this.evaluator.getAllowedActions(detail, {
      actorId: personId,
      hasSupported: detail.hasSupported,
      hasThirdPartyInfo: detail.hasThirdPartyInfo,
    });

    return ChurchNeedSignalResponseDto.fromEntity(
      detail,
      allowedActions,
      detail.supportCount,
      detail.recentInformation,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async editSignal(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: EditChurchNeedSignalDto,
  ) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    return this.churchNeedSignalsService.editSignal(personId, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteSignal(@Req() req: any, @Param('id') id: string) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    return this.churchNeedSignalsService.deleteSignal(personId, id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateChurchNeedSignalStatusDto,
  ) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    return this.churchNeedSignalsService.updateStatus(personId, id, dto);
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
