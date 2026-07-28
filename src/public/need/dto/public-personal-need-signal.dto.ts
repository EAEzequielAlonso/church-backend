import { NeedSignalStatus } from '../../enums/public.enums';
import { NeedSignal } from '../entities/need-signal.entity';
import { AnonymizationUtil } from '../utils/anonymization.util';

export class PublicPersonalNeedSignalDto {
  id: string;
  shortName: string;
  createdAt: Date;
  relativeTime: string;
  publicNote: string;
  status: NeedSignalStatus;

  static fromEntity(signal: NeedSignal): PublicPersonalNeedSignalDto {
    const dto = new PublicPersonalNeedSignalDto();
    dto.id = signal.id;
    dto.shortName = signal.person
      ? AnonymizationUtil.anonymizeName(
          signal.person.firstName,
          signal.person.lastName,
        )
      : 'Anónimo';
    dto.createdAt = signal.createdAt;

    // Relative time estimation
    const diffMs = Date.now() - signal.createdAt.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      dto.relativeTime = 'Hoy';
    } else if (diffDays === 1) {
      dto.relativeTime = 'Ayer';
    } else {
      dto.relativeTime = `Hace ${diffDays} días`;
    }

    dto.publicNote = signal.note || 'Buscando una iglesia sana.';
    dto.status = signal.status;
    return dto;
  }
}
