import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { MentorshipProcess } from '../entities/mentorship-process.entity';
import { MentorshipType, MentorshipStatus, ParticipantStatus } from '../enums/mentorship.enum';
import { MentorshipMeeting } from '../entities/mentorship-meeting.entity';
import { MentorshipTask } from '../entities/mentorship-task.entity';

export interface FindAllMentorshipsCriteria {
  churchId: string;
  page: number;
  limit: number;
  type?: MentorshipType;
  status?: MentorshipStatus;
  userChurchPersonId?: string;
  requireParticipantMatch?: boolean;
  participantStatuses?: ParticipantStatus[];
}

@Injectable()
export class MentorshipService {
  constructor(
    @InjectRepository(MentorshipProcess)
    private readonly repository: Repository<MentorshipProcess>,
    @InjectRepository(MentorshipMeeting)
    private readonly meetingRepository: Repository<MentorshipMeeting>,
    @InjectRepository(MentorshipTask)
    private readonly taskRepository: Repository<MentorshipTask>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Executes a callback within a managed transaction.
   * Useful when composing multiple saves (e.g. create process + participants) explicitly,
   * although save(process) with cascades already uses implicit transactions.
   */
  async runInTransaction<T>(
    operation: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction(operation);
  }

  /**
   * Guarda un proceso de mentoría junto con sus relaciones en cascada.
   * Al utilizar save sobre la entidad raíz con cascades, 
   * TypeORM ejecuta la operación dentro de una transacción.
   */
  async save(process: MentorshipProcess, manager?: EntityManager): Promise<MentorshipProcess> {
    const repo = manager ? manager.getRepository(MentorshipProcess) : this.repository;
    return repo.save(process);
  }

  /**
   * Encuentra un proceso por su ID.
   */
  async findById(id: string, churchId: string): Promise<MentorshipProcess | null> {
    return this.repository.findOne({
      where: { id, churchId },
      relations: {
        participants: {
          churchPerson: {
            person: true,
          },
        },
        meetings: {
          calendarEvent: true,
        },
        notes: {
          meeting: {
            calendarEvent: true,
          },
        },
        tasks: {
          meeting: {
            calendarEvent: true,
          },
        },
      },
    });
  }

  /**
   * Encuentra múltiples procesos de forma paginada para una iglesia.
   */
  async findAll(
    criteria: FindAllMentorshipsCriteria,
  ): Promise<{ data: MentorshipProcess[]; total: number }> {
    const query = this.repository.createQueryBuilder('process');

    if (criteria.requireParticipantMatch && criteria.userChurchPersonId) {
      // Inner Join: The process is only returned if the specific user is a participant
      const statuses = criteria.participantStatuses || [
        ParticipantStatus.ACCEPTED,
        ParticipantStatus.AUTO_ACCEPTED,
      ];

      query.innerJoin(
        'process.participants',
        'participantFilter',
        'participantFilter.churchPersonId = :userId AND participantFilter.status IN (:...statuses)',
        { userId: criteria.userChurchPersonId, statuses },
      );
    }

    query
      .leftJoinAndSelect('process.participants', 'participant')
      .leftJoinAndSelect('participant.churchPerson', 'churchPerson')
      .leftJoinAndSelect('churchPerson.person', 'person')
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

  /**
   * Elimina físicamente un proceso y sus dependencias de la base de datos.
   */
  async hardDelete(id: string, churchId: string): Promise<void> {
    await this.repository.delete({ id, churchId });
  }

  async findMeetingById(id: string, churchId: string): Promise<MentorshipMeeting | null> {
    return this.meetingRepository.findOne({ where: { id, process: { churchId } }, relations: ['process'] });
  }

  async findTaskById(id: string, churchId: string): Promise<MentorshipTask | null> {
    return this.taskRepository.findOne({ where: { id, process: { churchId } }, relations: ['process'] });
  }

  async saveTask(task: MentorshipTask): Promise<MentorshipTask> {
    return this.taskRepository.save(task);
  }

  async deleteTask(id: string, churchId: string): Promise<void> {
    // Delete only works directly on entity if we fetch it first, but we can do a query builder or pass to delete if task is verified.
    // Or just rely on previous checks, but to be safe: 
    // This is hard to do with pure delete without joining process. We rely on the UseCase having verified it via findTaskById.
    await this.taskRepository.delete(id);
  }
}
