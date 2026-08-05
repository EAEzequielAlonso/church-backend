import { Controller, Get, Param, NotFoundException, Query } from '@nestjs/common';
import { MissionsService } from '../services/missions.service';
import { MissionProjectResponseDto } from '../dto/mission-response.dto';

@Controller('public/missions')
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 12;
    const result = await this.missionsService.findAllActive(pageNum, limitNum);
    return {
      data: result.data.map((m) => MissionProjectResponseDto.fromEntity(m)),
      total: result.total,
      page: result.page,
      pageSize: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
      hasNextPage: result.page < Math.ceil(result.total / result.limit),
      hasPreviousPage: result.page > 1
    };
  }

  @Get(':id/map-summary')
  async mapSummary(@Param('id') id: string) {
    const result = await this.missionsService.mapSummary(id);
    if (!result) throw new NotFoundException('Mission not found');
    return result;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const mission = await this.missionsService.findOne(id);
    return MissionProjectResponseDto.fromEntity(mission);
  }
}
