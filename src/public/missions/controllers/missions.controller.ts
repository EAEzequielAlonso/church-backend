import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { MissionsService } from '../services/missions.service';
import { MissionProjectResponseDto } from '../dto/mission-response.dto';

@Controller('missions')
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  @Get()
  async findAll() {
    const missions = await this.missionsService.findAllActive();
    return missions.map(m => MissionProjectResponseDto.fromEntity(m));
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
