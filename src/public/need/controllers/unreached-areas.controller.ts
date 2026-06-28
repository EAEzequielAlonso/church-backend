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
  Patch,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { UnreachedAreasService } from '../services/unreached-areas.service';
import { CreateUnreachedAreaDto } from '../dto/unreached-areas/create-unreached-area.dto';
import { UpdateUnreachedAreaDto } from '../dto/unreached-areas/update-unreached-area.dto';
import { UnreachedAreaFilterDto } from '../dto/unreached-areas/unreached-area-filter.dto';
import { UpdateUnreachedAreaStatusDto } from '../dto/unreached-areas/update-unreached-area-status.dto';
import { AddNeedInformationDto } from '../dto/church-need-signals/add-need-information.dto';
import { InformationFilterDto } from '../dto/church-need-signals/information-filter.dto';

@Controller('public/unreached-areas')
export class UnreachedAreasController {
  constructor(private readonly unreachedAreasService: UnreachedAreasService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Req() req: any, @Body() dto: CreateUnreachedAreaDto) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    return this.unreachedAreasService.create(personId, dto);
  }

  @Get()
  async findAll(@Query() filterDto: UnreachedAreaFilterDto) {
    return this.unreachedAreasService.findAll(filterDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.unreachedAreasService.findOne(id);
  }

  @Get(':id/map-summary')
  async mapSummary(@Param('id') id: string) {
    const result = await this.unreachedAreasService.mapSummary(id);
    if (!result) throw new NotFoundException('Unreached Area not found');
    return result;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateUnreachedAreaDto,
  ) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    return this.unreachedAreasService.update(id, personId, dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateUnreachedAreaStatusDto,
  ) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    return this.unreachedAreasService.updateStatus(id, personId, dto);
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
    return this.unreachedAreasService.addInformation(personId, id, dto);
  }

  @Get(':id/information')
  async listInformation(
    @Param('id') id: string,
    @Query() filterDto: InformationFilterDto,
  ) {
    return this.unreachedAreasService.listInformation(id, filterDto);
  }
}
