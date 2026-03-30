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

  @Post('essential')
  @ApiOperation({ summary: 'Seed essential system data (Plans, Categories, etc.)' })
  async seedEssential() {
    return this.seedService.seedEssentialData();
  }

  @Post('test-data')
  @ApiOperation({ summary: 'Run full database seeding with test data (Faker/JSON)' })
  async runTestData() {
    return this.seedService.run();
  }
}
