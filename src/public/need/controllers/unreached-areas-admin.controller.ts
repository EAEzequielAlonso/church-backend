import {
  Controller,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { UnreachedAreasService } from '../services/unreached-areas.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { SecurityContextGuard } from '../../../core/auth/guards/security-context.guard';
import { PermissionsGuard } from '../../../core/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../core/auth/decorators/require-permissions.decorator';
import { AppPermission } from '../../../core/auth/authorization/permissions.enum';
import { UpdateUnreachedAreaDto } from '../dto/unreached-areas/update-unreached-area.dto';
import { UpdateUnreachedAreaStatusDto } from '../dto/unreached-areas/update-unreached-area-status.dto';

@Controller('public/unreached-areas/admin')
@UseGuards(JwtAuthGuard, SecurityContextGuard, PermissionsGuard)
@RequirePermissions(AppPermission.NETWORK_ADMINISTRATION)
export class UnreachedAreasAdminController {
  constructor(private readonly unreachedAreasService: UnreachedAreasService) {}

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUnreachedAreaDto,
  ) {
    return this.unreachedAreasService.updateAsAdmin(id, dto);
  }

  @Patch(':id/status')
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateUnreachedAreaStatusDto,
  ) {
    const adminPersonId = req.user?.personId;
    if (!adminPersonId) throw new UnauthorizedException('Missing person context');
    return this.unreachedAreasService.updateStatusAsAdmin(id, adminPersonId, dto);
  }
}
