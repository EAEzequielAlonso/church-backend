import {
  Body,
  Controller,
  Post,
  Get,
  Patch,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ChurchesService } from './churches.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CreateChurchDto } from './dto/create-church.dto';
import { UpdateChurchProfileDto } from './dto/update-church-profile.dto';
import { CurrentChurch } from '../common/decorators';
import { FunctionalRole } from '../common/enums';

@Controller('churches')
export class ChurchesController {
  constructor(private readonly churchesService: ChurchesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req, @Body() dto: CreateChurchDto) {
    console.log('Create Church Request Body:', JSON.stringify(dto, null, 2));
    console.log('User:', req.user);
    return this.churchesService.create(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR)
  @Get('active')
  getActive(@CurrentChurch() churchId: string) {
    return this.churchesService.getActive(churchId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR)
  @Patch('active')
  updateActive(
    @CurrentChurch() churchId: string,
    @Body() dto: UpdateChurchProfileDto,
  ) {
    return this.churchesService.updateActive(churchId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    FunctionalRole.ADMIN_CHURCH,
    FunctionalRole.TREASURER,
    FunctionalRole.AUDITOR,
    FunctionalRole.MEMBER,
  )
  @Get('current')
  getCurrent(@CurrentChurch() churchId: string) {
    return this.churchesService.findOne(churchId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('current')
  update(@CurrentChurch() churchId: string, @Body() dto: any) {
    return this.churchesService.update(churchId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('search')
  search(@Query('q') query: string) {
    return this.churchesService.search(query);
  }
}
