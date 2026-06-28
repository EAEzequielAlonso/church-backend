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
import {
  NeedInformationCategory,
  NeedInformationEntityType,
  NeedInformationSourceType,
} from '../enums/need-signals.enum';

@Entity('need_informations')
@Index(['entityType', 'entityId'])
@Index(['entityType', 'entityId', 'createdAt'])
@Index(['personId', 'createdAt'])
export class NeedInformation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  personId: string;

  @ManyToOne(() => Person, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'personId' })
  person: Person;

  @Column({ type: 'enum', enum: NeedInformationEntityType })
  entityType: NeedInformationEntityType;

  @Column({ type: 'uuid' })
  entityId: string;

  @Column({ type: 'enum', enum: NeedInformationCategory })
  category: NeedInformationCategory;

  @Column({ type: 'enum', enum: NeedInformationSourceType, nullable: true })
  sourceType: NeedInformationSourceType;

  @Column({ nullable: true })
  title: string;

  @Column({ type: 'text' })
  content: string;

  // JSONB array for multimedia attachments
  // Array<{ type: 'IMAGE' | 'VIDEO' | 'LINK', url: string }>
  @Column({ type: 'jsonb', nullable: true })
  attachments: Record<string, unknown>[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
