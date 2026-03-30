import { Controller, Post, UseGuards } from '@nestjs/common';
import { SeedService } from './seed.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { SystemRole } from '../common/enums';

@ApiTags('Seed')
@ApiBearerAuth()
@Controller('seed')
@Roles(SystemRole.ADMIN_APP)
@UseGuards(JwtAuthGuard, RolesGuard)
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
