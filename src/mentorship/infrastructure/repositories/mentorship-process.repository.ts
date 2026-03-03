import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MentorshipProcess } from '../entities/mentorship-process.entity';
import {
  IMentorshipProcessRepository,
  FindAllMentorshipsCriteria,
} from '../../domain/repositories/mentorship-process.repository.interface';

@Injectable()
export class TypeOrmMentorshipProcessRepository implements IMentorshipProcessRepository {
  constructor(
    @InjectRepository(MentorshipProcess)
    private readonly repository: Repository<MentorshipProcess>,
  ) {}

  async save(process: MentorshipProcess): Promise<MentorshipProcess> {
    // En TypeORM, `save` persiste el agregado raíz y todas sus relaciones TheOneToMany configuradas con `cascade: true`.
    return this.repository.save(process);
  }

  async findById(id: string): Promise<MentorshipProcess | null> {
    return this.repository.findOne({
      where: { id },
      relations: {
        participants: true,
        meetings: true,
        notes: true,
        tasks: true,
      },
    });
  }

  async findAll(
    criteria: FindAllMentorshipsCriteria,
  ): Promise<{ data: MentorshipProcess[]; total: number }> {
    const query = this.repository.createQueryBuilder('process');

    if (criteria.requireParticipantMatch && criteria.userChurchPersonId) {
      // Inner Join: The process is only returned if the specific user is a participant
      query.innerJoin(
        'process.participants',
        'participantFilter',
        'participantFilter.churchPersonId = :userId',
        { userId: criteria.userChurchPersonId },
      );
    }

    query
      .leftJoinAndSelect('process.participants', 'participant')
      .where('process.churchId = :churchId', { churchId: criteria.churchId });

    if (criteria.type) {
      query.andWhere('process.type = :type', { type: criteria.type });
    }

    if (criteria.status) {
      query.andWhere('process.status = :status', { status: criteria.status });
    }

    query.skip((criteria.page - 1) * criteria.limit);
    query.take(criteria.limit);

    // No cargamos relationships excesivos para listas (notes, tasks, meetings) por performance
    query.orderBy('process.createdAt', 'DESC');

    const [data, total] = await query.getManyAndCount();
    return { data, total };
  }

  async hardDelete(id: string): Promise<void> {
    // Ejecución de borrado físico.
    // Las entidades relacionadas (participants, meetings, notes, tasks)
    // serán destruidas gracias a las foreign keys configuradas con onDelete: 'CASCADE'.
    await this.repository.delete(id);
  }
}
