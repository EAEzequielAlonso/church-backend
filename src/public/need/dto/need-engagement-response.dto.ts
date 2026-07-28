import { NeedEngagementStatus } from '../enums/need-signals.enum';
import { NeedEngagement } from '../entities/need-engagement.entity';
import { AnonymizationUtil } from '../utils/anonymization.util';

export class NeedEngagementResponseDto {
  id: string;
  status: NeedEngagementStatus;
  createdAt: Date;
  notes: string;
  supporterShortName?: string; // Optional, only if populated

  static fromEntity(engagement: NeedEngagement): NeedEngagementResponseDto {
    const dto = new NeedEngagementResponseDto();
    dto.id = engagement.id;
    dto.status = engagement.status;
    dto.createdAt = engagement.createdAt;
    dto.notes = engagement.notes;

    // Privacy: We don't expose full person object.
    // If we want the owner to see who requested, we could expose the full name,
    // but the user's rule #7 states: "el DTO debe anonimizar también a Persona B a menos que haya aceptado... O bien revelar... en Telyon el perfil es público, por lo que revelar a Persona B está bien".
    // I will expose full name since Persona A needs to know who is requesting contact.
    // Actually, I'll stick to a safe default: expose full name if person is joined, else short name. Let's just use full name because they need to evaluate the request.
    if (engagement.person) {
      dto.supporterShortName = `${engagement.person.firstName} ${engagement.person.lastName}`;
    }

    return dto;
  }
}
