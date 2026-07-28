import { NeedSignal } from '../entities/need-signal.entity';

export class NeedEngagementContactDetailsDto {
  email: string | null;
  phone: string | null;
  contactUrl: string | null;

  static fromSignal(signal: NeedSignal): NeedEngagementContactDetailsDto {
    const dto = new NeedEngagementContactDetailsDto();
    dto.email = signal.contactEmail || null;
    dto.phone = signal.contactPhone || null;
    dto.contactUrl = signal.contactUrl || null;
    return dto;
  }
}
