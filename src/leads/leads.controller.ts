import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { QueryLeadsDto } from './dto/query-leads.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { SystemRole } from '../common/enums';

@ApiTags('leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new lead' })
  create(@Body() createLeadDto: CreateLeadDto) {
    return this.leadsService.create(createLeadDto);
  }

  @Get()
  @ApiBearerAuth()
  @Roles(SystemRole.ADMIN_APP)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'List leads with pagination and filtering' })
  findAll(@Query() query: QueryLeadsDto) {
    return this.leadsService.findAll(query);
  }

  @Get(':id')
  @ApiBearerAuth()
  @Roles(SystemRole.ADMIN_APP)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get a single lead by ID' })
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @Roles(SystemRole.ADMIN_APP)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Update lead status' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateLeadStatusDto: UpdateLeadStatusDto,
  ) {
    return this.leadsService.updateStatus(id, updateLeadStatusDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(SystemRole.ADMIN_APP)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Soft delete a lead' })
  remove(@Param('id') id: string) {
    return this.leadsService.remove(id);
  }
}
