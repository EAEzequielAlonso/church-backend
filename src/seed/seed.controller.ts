import { Controller, Post, UseGuards } from '@nestjs/common';
import { SeedService } from './seed.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SecurityContextGuard } from '../auth/guards/security-context.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AppPermission } from '../auth/authorization/permissions.enum';

@ApiTags('Seed')
@ApiBearerAuth()
@Controller('seed')
@UseGuards(JwtAuthGuard, SecurityContextGuard, PermissionsGuard)
@RequirePermissions(AppPermission.ROLE_MANAGE)
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post('essentiall')
  @ApiOperation({ summary: 'Seed essential system data (Plans, Categories, etc.)' })
  async seedEssential() {
    return this.seedService.seedEssentialData();
  }

  @Post('test-dataa')
  @ApiOperation({ summary: 'Run full database seeding with test data (Faker/JSON)' })
  async runTestData() {
    return this.seedService.run();
  }
  // para crear un super admin naaaa es para pusher
  @Post('super-admin')
  @ApiOperation({ summary: 'Seed super admin' })
  async seedSuperAdmin() {
    return "hola ";
  }
   
}
