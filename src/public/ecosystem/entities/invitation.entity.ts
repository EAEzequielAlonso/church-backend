import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Person } from 'src/core/users/entities/person.entity';
import { Church } from 'src/core/churches/entities/church.entity';

export enum InvitationType {
  GENERAL_USER = 'GENERAL_USER',
  NEED_SIGNAL_USER = 'NEED_SIGNAL_USER',
  CHURCH_ADMIN_CLAIM = 'CHURCH_ADMIN_CLAIM',
  CHURCH_MEMBERSHIP = 'CHURCH_MEMBERSHIP',
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

@Entity('invitations')
@Index(['token'], { unique: true })
@Index(['inviterPersonId', 'type'])
@Index(['status'])
@Index(['invitedEmail'])
@Index(['targetChurchId'])
@Index(['expiresAt'])
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: InvitationType,
    default: InvitationType.GENERAL_USER,
  })
  type: InvitationType;

  @Column({
    type: 'enum',
    enum: InvitationStatus,
    default: InvitationStatus.PENDING,
  })
  status: InvitationStatus;

  @Column({ type: 'uuid' })
  inviterPersonId: string;

  @ManyToOne(() => Person, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inviterPersonId' })
  inviterPerson: Person;

  // Referencia opcional dependiendo del tipo de invitación
  @Column({ type: 'uuid', nullable: true })
  targetChurchId: string;

  @ManyToOne(() => Church, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'targetChurchId' })
  targetChurch: Church;

  @Column()
  invitedEmail: string;

  @Column({ unique: true })
  token: string;

  @Column({ type: 'uuid', nullable: true })
  acceptedByPersonId: string;

  @ManyToOne(() => Person, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'acceptedByPersonId' })
  acceptedByPerson: Person;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  acceptedAt: Date;

  @Column({ type: 'int', default: 0 })
  reminderCount: number;
}
