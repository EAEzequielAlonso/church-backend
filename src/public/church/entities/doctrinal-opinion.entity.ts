import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Person } from 'src/core/users/entities/person.entity';
import { Church } from 'src/core/churches/entities/church.entity';

export enum DoctrinalOpinionValue {
  POSITIVE = 'POSITIVE',
  NEUTRAL = 'NEUTRAL',
  NEGATIVE = 'NEGATIVE',
}

@Entity('doctrinal_opinions')
@Index(['churchId', 'personId'], { unique: true }) // Una opinión por usuario por iglesia
@Index(['churchId', 'reviewedByAdmin'])
export class DoctrinalOpinion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  personId: string;

  @ManyToOne(() => Person, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'personId' })
  person: Person;

  @Column({ type: 'uuid' })
  churchId: string;

  @ManyToOne(() => Church, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'churchId' })
  church: Church;

  @Column({ type: 'enum', enum: DoctrinalOpinionValue })
  opinion: DoctrinalOpinionValue;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ default: false })
  reviewedByAdmin: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
