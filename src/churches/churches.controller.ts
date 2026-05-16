import {
  Body,
  Controller,
  Post,
  Get,
  Patch,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ChurchesService } from './churches.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SecurityContextGuard } from '../auth/guards/security-context.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AppPermission } from '../auth/authorization/permissions.enum';
import { CreateChurchDto } from './dto/create-church.dto';
import { UpdateChurchProfileDto } from './dto/update-church-profile.dto';
import { CurrentChurch, CurrentUser } from '../common/decorators';
import { SecurityContext } from '../auth/security-context.interface';

@Controller('churches')
export class ChurchesController {
  constructor(private readonly churchesService: ChurchesService) {}

  @UseGuards(JwtAuthGuard, SecurityContextGuard, PermissionsGuard)
  @Post()
  @RequirePermissions(AppPermission.CHURCH_MANAGE)
  create(@CurrentUser() user: SecurityContext, @Body() dto: CreateChurchDto) {
    return this.churchesService.create(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, SecurityContextGuard, PermissionsGuard)
  @RequirePermissions(AppPermission.CHURCH_VIEW)
  @Get('active')
  getActive(@CurrentChurch() churchId: string) {
    return this.churchesService.getActive(churchId);
  }

  @UseGuards(JwtAuthGuard, SecurityContextGuard, PermissionsGuard)
  @RequirePermissions(AppPermission.CHURCH_MANAGE)
  @Patch('active')
  updateActive(
    @CurrentChurch() churchId: string,
    @Body() dto: UpdateChurchProfileDto,
  ) {
    return this.churchesService.updateActive(churchId, dto);
  }

  @UseGuards(JwtAuthGuard, SecurityContextGuard, PermissionsGuard)
  @RequirePermissions(AppPermission.CHURCH_VIEW)
  @Get('current')
  getCurrent(@CurrentChurch() churchId: string) {
    return this.churchesService.findOne(churchId);
  }

  @UseGuards(JwtAuthGuard, SecurityContextGuard, PermissionsGuard)
  @RequirePermissions(AppPermission.CHURCH_MANAGE)
  @Patch('current')
  update(@CurrentChurch() churchId: string, @Body() dto: any) {
    return this.churchesService.update(churchId, dto);
  }

  @UseGuards(JwtAuthGuard, SecurityContextGuard, PermissionsGuard)
  @RequirePermissions(AppPermission.CHURCH_VIEW)
  @Get('search')
  search(@Query('q') query: string) {
    return this.churchesService.search(query);
  }
}
