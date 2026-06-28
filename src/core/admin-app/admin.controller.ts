import { Controller, Get, Patch, Param, Body, UseGuards, Post } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PermissionsGuard } from 'src/core/auth/guards/permissions.guard';
import { SecurityContextGuard } from 'src/core/auth/guards/security-context.guard';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { AppPermission } from 'src/core/auth/authorization/permissions.enum';
import { RequirePermissions } from 'src/core/auth/decorators/require-permissions.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, SecurityContextGuard, PermissionsGuard)
@RequirePermissions(AppPermission.ROLE_MANAGE)
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @Get('dashboard')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('churches')
  getChurches() {
    return this.adminService.getChurches();
  }

  @Get('churches/:id/verification')
  getChurchVerification(@Param('id') id: string) {
    return this.adminService.getChurchVerification(id);
  }

  @Patch('churches/:id/verify')
  verifyChurch(
    @Param('id') id: string,
    @Body() body: { isVerified: boolean }
  ) {
    return this.adminService.verifyChurch(id, body.isVerified);
  }

  @Patch('churches/:id/deactivate')
  deactivateChurch(@Param('id') id: string) {
    return this.adminService.deactivateChurch(id);
  }

  @Get('users')
  getUsers() {
    return this.adminService.getUsers();
  }

  @Patch('users/:id/active')
  toggleUserActive(
    @Param('id') id: string,
    @Body() body: { isActive: boolean }
  ) {
    return this.adminService.toggleUserActive(id, body.isActive);
  }

  @Get('administration-requests')
  getAdministrationRequests() {
    return this.adminService.getAdministrationRequests();
  }

  @Post('administration-requests/:id/approve')
  approveAdministrationRequest(@Param('id') id: string) {
    return this.adminService.approveAdministrationRequest(id);
  }

  @Post('administration-requests/:id/reject')
  rejectAdministrationRequest(
    @Param('id') id: string,
    @Body() body: { notes?: string }
  ) {
    return this.adminService.rejectAdministrationRequest(id, body.notes);
  }
}
