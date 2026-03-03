import { MentorshipProcess } from '../../infrastructure/entities/mentorship-process.entity';
import { MentorshipType, MentorshipStatus } from '../enums/mentorship.enum';

export interface FindAllMentorshipsCriteria {
  churchId: string;
  page: number;
  limit: number;
  type?: MentorshipType;
  status?: MentorshipStatus;
  userChurchPersonId?: string;
  requireParticipantMatch?: boolean;
}

export interface IMentorshipProcessRepository {
  /**
   * Guarda un proceso de mentoría (Creación o Actualización) junto con sus relaciones en cascada.
   */
  save(process: MentorshipProcess): Promise<MentorshipProcess>;

  /**
   * Encuentra un proceso por su ID.
   */
  findById(id: string): Promise<MentorshipProcess | null>;

  /**
   * Encuentra múltiples procesos de forma paginada para una iglesia.
   */
  findAll(
    criteria: FindAllMentorshipsCriteria,
  ): Promise<{ data: MentorshipProcess[]; total: number }>;

  /**
   * Elimina físicamente un proceso y sus dependencias de la base de datos (Hard Delete).
   */
  hardDelete(id: string): Promise<void>;
}
