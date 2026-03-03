import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { Church } from '../../../churches/entities/church.entity';
import { BaseDomainEvent } from '../../domain/events/base-domain-event';
import {
  MentorshipProcessCreatedEvent,
  MentorshipMeetingAddedEvent,
  MentorshipNoteAddedEvent,
  MentorshipTaskAddedEvent,
  MentorshipStatusChangedEvent,
} from '../../domain/events/mentorship-events';
import {
  MentorshipType,
  MentorshipMode,
  MentorshipStatus,
  MentorshipRole,
  ParticipantStatus,
  MentorshipNoteType,
} from '../../domain/enums/mentorship.enum';
import { MentorshipProcessParticipant } from './mentorship-process-participant.entity';
import { MentorshipMeeting } from './mentorship-meeting.entity';
import { MentorshipTask } from './mentorship-task.entity';
import { MentorshipNote } from './mentorship-note.entity';

@Entity('mentorship_processes')
@Index(['churchId', 'status'])
@Index(['type', 'mode'])
export class MentorshipProcess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Lista temporal no persistida en la Base de Datos para recolectar Domain Events
  private _domainEvents: BaseDomainEvent[] = [];

  /**
   * Extrae y vacía la pila de eventos de dominio acumulados.
   */
  public pullDomainEvents(): BaseDomainEvent[] {
    const events = this._domainEvents;
    this._domainEvents = [];
    return events;
  }

  @Column({
    type: 'enum',
    enum: MentorshipType,
  })
  type: MentorshipType;

  @Column({
    type: 'enum',
    enum: MentorshipMode,
  })
  mode: MentorshipMode;

  @Column({ type: 'text', nullable: true })
  motive: string;

  @Column({
    type: 'enum',
    enum: MentorshipStatus,
    default: MentorshipStatus.ACTIVE,
  })
  status: MentorshipStatus;

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'text', nullable: true })
  closeObservation: string; // Obligatorio cuando status pasa a CLOSED

  @ManyToOne(() => Church, { nullable: false, onDelete: 'CASCADE' })
  church: Church;

  @Column({ nullable: false })
  churchId: string;

  @OneToMany(
    () => MentorshipProcessParticipant,
    (participant) => participant.process,
    { cascade: true },
  )
  participants: MentorshipProcessParticipant[];

  @OneToMany(() => MentorshipMeeting, (meeting) => meeting.process, {
    cascade: true,
  })
  meetings: MentorshipMeeting[];

  @OneToMany(() => MentorshipNote, (note) => note.process, { cascade: true })
  notes: MentorshipNote[];

  @OneToMany(() => MentorshipTask, (task) => task.process, { cascade: true })
  tasks: MentorshipTask[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // --- DOMAIN METHODS ---

  /**
   * Valida y asegura las reglas del proceso en el estado actual.
   */
  private assertNotClosed() {
    if (this.status === MentorshipStatus.CLOSED) {
      throw new Error('El proceso de mentoría está cerrado y es inmutable.');
    }
  }

  /**
   * Valida que el proceso se encuentre estrictamente activo para permitir mutaciones.
   */
  private assertActive() {
    this.assertNotClosed();
    if (this.status === MentorshipStatus.PAUSED) {
      throw new Error(
        'El proceso de mentoría está pausado. No se pueden realizar modificaciones sin antes activarlo.',
      );
    }
  }

  /**
   * Transiciona el estado del proceso. CLOSED es irreversible.
   */
  public changeStatus(newStatus: MentorshipStatus, closeObservation?: string) {
    this.assertNotClosed();
    const oldStatus = this.status;

    if (newStatus === MentorshipStatus.CLOSED) {
      if (!closeObservation || closeObservation.trim() === '') {
        throw new Error(
          'Es obligatoria una observación (closeObservation) para cerrar un proceso.',
        );
      }
      this.closeObservation = closeObservation;
      this.endDate = new Date();
    }

    this.status = newStatus;

    this._domainEvents.push(
      new MentorshipStatusChangedEvent(this.id, oldStatus, this.status),
    );
  }

  /**
   * Añade un participante al proceso respetando las reglas de Modo.
   */
  public addParticipant(
    participant: MentorshipProcessParticipant,
    hasUserAccount: boolean,
  ) {
    this.assertActive();

    if (!this.participants) {
      this.participants = [];
    }

    if (this.type === MentorshipType.FOLLOW_UP) {
      if (participant.role === MentorshipRole.MENTOR) {
        const currentMentors = this.participants.filter(
          (p) => p.role === MentorshipRole.MENTOR,
        );
        if (currentMentors.length >= 1) {
          throw new Error(
            'Un proceso de SEGUIMIENTO solo puede tener exactamente 1 guía.',
          );
        }
      } else {
        const currentParticipants = this.participants.filter(
          (p) => p.role === MentorshipRole.PARTICIPANT,
        );
        if (currentParticipants.length >= 1) {
          throw new Error(
            'Un proceso de SEGUIMIENTO solo puede tener como máximo 1 guiado.',
          );
        }
      }
    }

    if (this.mode === MentorshipMode.INFORMAL) {
      // Informal no requiere aprobación
      participant.status = ParticipantStatus.AUTO_ACCEPTED;
    } else {
      // Modo FORMAL
      if (participant.role === MentorshipRole.PARTICIPANT) {
        // Participantes requieren aprobación si su Person tiene User asociado
        participant.status = hasUserAccount
          ? ParticipantStatus.PENDING
          : ParticipantStatus.AUTO_ACCEPTED;
      } else {
        // Los mentores se auto-aceptan asumiendo que el proceso fue creado por ellos o un admin
        participant.status = ParticipantStatus.AUTO_ACCEPTED;
      }
    }

    participant.process = this;
    participant.processId = this.id;
    this.participants.push(participant);
  }

  /**
   * Aprueba la participación de un usuario (Solo en modo FORMAL).
   */
  public approveParticipant(churchPersonId: string) {
    this.assertActive();

    if (this.mode !== MentorshipMode.FORMAL) {
      throw new Error(
        'Solo los procesos FORMALES requieren y permiten la aprobación de participantes.',
      );
    }

    if (!this.participants) {
      throw new Error('Los participantes no han sido cargados en memoria.');
    }

    const participant = this.participants.find(
      (p) => p.churchPersonId === churchPersonId,
    );

    if (!participant) {
      throw new Error(
        'No se encontró al participante indicado dentro de este proceso.',
      );
    }

    if (participant.status !== ParticipantStatus.PENDING) {
      throw new Error(
        'El participante no se encuentra en estado PENDING y no requiere aprobación.',
      );
    }

    participant.status = ParticipantStatus.ACCEPTED;
  }

  /**
   * Valida que el proceso cumpla el mínimo estructural al ser inicializado.
   */
  public validateStructuralIntegrity() {
    if (!this.participants) return;

    const mentorsCount = this.participants.filter(
      (p) => p.role === MentorshipRole.MENTOR,
    ).length;
    const guidedCount = this.participants.filter(
      (p) => p.role === MentorshipRole.PARTICIPANT,
    ).length;

    if (mentorsCount < 1 || guidedCount < 1) {
      throw new Error(
        'Un proceso debe tener al menos 1 mentor y 1 participante activo.',
      );
    }

    if (this.type === MentorshipType.FOLLOW_UP) {
      if (mentorsCount !== 1) {
        throw new Error(
          'Un proceso de SEGUIMIENTO debe tener exactamente 1 mentor.',
        );
      }
      if (guidedCount > 1) {
        throw new Error(
          'Un proceso de SEGUIMIENTO solo permite un máximo de 1 participante.',
        );
      }
    }
  }

  /**
   * Añade un encuentro garantizando que el proceso esté activo.
   */
  public addMeeting(meeting: MentorshipMeeting) {
    this.assertActive();

    if (!this.meetings) {
      this.meetings = [];
    }

    meeting.process = this;
    meeting.processId = this.id;
    this.meetings.push(meeting);

    this._domainEvents.push(
      new MentorshipMeetingAddedEvent(
        this.id,
        meeting.id,
        meeting.title,
        meeting.description,
        meeting.color,
        meeting.scheduledDate,
        meeting.endDate,
        meeting.location,
      ),
    );
  }

  /**
   * Añade una tarea validando que el modo lo permita.
   */
  public addTask(task: MentorshipTask) {
    this.assertActive();

    if (this.mode === MentorshipMode.INFORMAL) {
      throw new Error(
        'No se pueden asignar tareas en un proceso de modo INFORMAL.',
      );
    }

    if (!this.tasks) {
      this.tasks = [];
    }

    task.process = this;
    task.processId = this.id;
    this.tasks.push(task);

    this._domainEvents.push(
      new MentorshipTaskAddedEvent(
        this.id,
        task.id,
        task.assignedChurchPersonId,
      ),
    );
  }

  /**
   * Añade una nota validando restricciones según el tipo.
   */
  public addNote(note: MentorshipNote) {
    this.assertActive();

    if (this.mode === MentorshipMode.INFORMAL) {
      if (note.type !== MentorshipNoteType.PERSONAL) {
        throw new Error(
          'En un proceso INFORMAL solo se permiten notas de tipo PERSONAL.',
        );
      }
    }

    if (!this.notes) {
      this.notes = [];
    }

    note.process = this;
    note.processId = this.id;
    this.notes.push(note);

    this._domainEvents.push(
      new MentorshipNoteAddedEvent(
        this.id,
        note.id,
        note.authorChurchPersonId,
        note.type,
      ),
    );
  }
}
