import { MissionProjectResponseDto } from './mission-response.dto';
import { MissionProjectAction } from '../enums/missions.enums';

export class MissionStatisticsDto {
  totalNeeds: number;
  fulfilledNeeds: number;
  totalCollaborations: number;
  activeCollaborations: number;
  publishedReports: number;
}

export class MissionProductDto extends MissionProjectResponseDto {
  allowedActions: MissionProjectAction[];
  statistics: MissionStatisticsDto;

  static fromResponse(
    responseDto: MissionProjectResponseDto,
    allowedActions: MissionProjectAction[] = [],
    statistics: MissionStatisticsDto,
  ): MissionProductDto {
    const dto = new MissionProductDto();

    // Copiar todas las propiedades del base DTO
    Object.assign(dto, responseDto);

    // Asignar los agregados de producto
    dto.allowedActions = allowedActions;
    dto.statistics = statistics;

    return dto;
  }
}
