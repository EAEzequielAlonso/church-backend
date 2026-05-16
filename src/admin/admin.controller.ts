import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SecurityContextGuard } from '../auth/guards/security-context.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AppPermission } from '../auth/authorization/permissions.enum';

@Controller('admin')
@UseGuards(JwtAuthGuard, SecurityContextGuard, PermissionsGuard)
@RequirePermissions(AppPermission.ROLE_MANAGE)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('churches')
  getChurches() {
    return this.adminService.getChurches();
  }

  @Get('users')
  getUsers() {
    return this.adminService.getUsers();
  }

  @Get('plans')
  getPlans() {
    return this.adminService.getPlans();
  }

  @Patch('plans/:id')
  updatePlan(
    @Param('id') id: string,
    @Body() updateData: { price?: number; isActive?: boolean },
  ) {
    return this.adminService.updatePlan(id, updateData);
  }
}
