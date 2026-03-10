import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Ministry } from './ministry.entity';
import { ChurchPerson } from '../../members/entities/church-person.entity';

@Entity('ministry_tasks')
export class MinistryTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Ministry, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ministryId' })
  ministry: Ministry;
  @Column()
  ministryId: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  observation: string;

  @ManyToOne(() => ChurchPerson, { nullable: true })
  @JoinColumn({ name: 'assignedToId' })
  assignedTo: ChurchPerson;
  @Column({ nullable: true })
  assignedToId: string;

  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({
    type: 'enum',
    enum: ['pending', 'in_progress', 'completed', 'incomplete', 'cancelled'],
    default: 'pending',
  })
  status: 'pending' | 'in_progress' | 'completed' | 'incomplete' | 'cancelled';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
