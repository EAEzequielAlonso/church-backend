import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, ParseUUIDPipe, Req, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { SmallGroupsService } from '../services/small-groups.service';
import { CreateSmallGroupDto } from '../dto/create-small-group.dto';
import { UpdateSmallGroupDto } from '../dto/update-small-group.dto';
import { FilterSmallGroupDto } from '../dto/filter-small-group.dto';
import { SmallGroupResponseDto } from '../dto/small-group-response.dto';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { RequirePermissions } from 'src/core/auth/decorators/require-permissions.decorator'; 
import { AppPermission } from 'src/core/auth/authorization/permissions.enum'; 

@Controller('small-groups')
export class SmallGroupsController {
  constructor(private readonly smallGroupsService: SmallGroupsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @RequirePermissions(AppPermission.GROUP_CREATE)
  async create(@Body() createSmallGroupDto: CreateSmallGroupDto, @Req() req: any) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    
    // Requires the user to have permission to create a group.
    // In a real scenario, we might also verify if the user has permission specifically for createSmallGroupDto.churchId
    const group = await this.smallGroupsService.create(createSmallGroupDto, personId);
    return SmallGroupResponseDto.fromEntity(group);
  }

  @Get()
  async findAll(@Query() filters: FilterSmallGroupDto) {
    const [items, total] = await this.smallGroupsService.findAll(filters);
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    return {
      items: items.map(g => SmallGroupResponseDto.fromEntity(g)),
      total,
      limit,
      offset,
    };
  }

  @Get(':id/map-summary')
  async mapSummary(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.smallGroupsService.mapSummary(id);
    if (!result) throw new NotFoundException(`SmallGroup with ID ${id} not found`);
    return result;
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const group = await this.smallGroupsService.findOne(id);
    return SmallGroupResponseDto.fromEntity(group);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions(AppPermission.GROUP_UPDATE)
  async update(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSmallGroupDto: UpdateSmallGroupDto,
    @Body('churchId') churchId: string // The churchId must be provided to verify ownership
  ) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    const group = await this.smallGroupsService.update(id, updateSmallGroupDto, churchId, personId);
    return SmallGroupResponseDto.fromEntity(group);
  }

  @Patch(':id/close')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions(AppPermission.GROUP_UPDATE)
  async closeGroup(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('churchId') churchId: string
  ) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    const group = await this.smallGroupsService.closeGroup(id, churchId, personId);
    return SmallGroupResponseDto.fromEntity(group);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions(AppPermission.GROUP_DELETE)
  remove(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('churchId') churchId: string,
    @Body('confirmationText') confirmationText: string
  ) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    // Hard delete warning explicitly acknowledged in the frontend
    return this.smallGroupsService.delete(id, churchId, personId, confirmationText);
  }
}
