import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  NeedEngagementStatus,
  NeedEngagementType,
  NeedEntityType,
} from '../enums/need-signals.enum';
import { Church } from 'src/core/churches/entities/church.entity';
import { Person } from 'src/core/users/entities/person.entity';

@Entity('need_engagements')
export class NeedEngagement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: NeedEntityType,
  })
  entityType: NeedEntityType;

  @Column()
  entityId: string;

  // iglesia que interviene

  @Column({ nullable: true })
  churchId: string;

  @ManyToOne(() => Church, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'churchId' })
  church: Church;

  // persona que interviene

  @Column({ nullable: true })
  personId: string;

  @ManyToOne(() => Person, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'personId' })
  person: Person;

  @Column({
    type: 'enum',
    enum: NeedEngagementType,
  })
  type: NeedEngagementType;

  @Column({
    type: 'enum',
    enum: NeedEngagementStatus,
    default: NeedEngagementStatus.ACTIVE,
  })
  status: NeedEngagementStatus;

  @Column({
    type: 'text',
    nullable: true,
  })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
