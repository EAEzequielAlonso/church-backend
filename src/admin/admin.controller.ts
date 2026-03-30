import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { SystemRole } from '../common/enums';

@Controller('admin')
@Roles(SystemRole.ADMIN_APP)
@UseGuards(JwtAuthGuard, RolesGuard)
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
