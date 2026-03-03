import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Ministry } from './ministry.entity';
import { ChurchPerson } from '../../members/entities/church-person.entity';

@Entity('ministry_tasks')
export class MinistryTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Ministry, { onDelete: 'CASCADE' })
  ministry: Ministry;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  observation: string;

  @ManyToOne(() => ChurchPerson, { nullable: true })
  assignedTo: ChurchPerson;

  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({
    type: 'enum',
    enum: ['pending', 'completed'],
    default: 'pending',
  })
  status: 'pending' | 'completed';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
