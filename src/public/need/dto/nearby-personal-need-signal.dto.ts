import { NeedSignal } from '../entities/need-signal.entity';
import { PublicPersonalNeedSignalDto } from './public-personal-need-signal.dto';

export class NearbyPersonalNeedSignalDto extends PublicPersonalNeedSignalDto {
  distanceLabel: string;
  locationLabel: string;

  static fromEntityWithProximity(
    signal: NeedSignal,
    distanceLabel: string,
  ): NearbyPersonalNeedSignalDto {
    const baseDto = PublicPersonalNeedSignalDto.fromEntity(signal);
    const dto = new NearbyPersonalNeedSignalDto();
    
    // Copy base properties
    Object.assign(dto, baseDto);
    
    // Add proximity-specific data
    dto.distanceLabel = distanceLabel;
    dto.locationLabel = signal.needLocation 
      ? `${signal.needLocation.city}, ${signal.needLocation.state}`
      : 'Ubicación desconocida';

    return dto;
  }
}
