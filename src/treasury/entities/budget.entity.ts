import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  Index,
  Unique,
  JoinColumn,
} from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { BudgetLine } from './budget-line.entity';

@Entity('budgets')
@Unique(['churchId', 'year', 'month'])
export class Budget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  churchId: string;

  @ManyToOne(() => Church)
  @JoinColumn({ name: 'churchId' })
  church: Church;

  @Column('int')
  year: number;

  @Column('int')
  month: number; // 1-12

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  projectedIncomeTotal: number; // Total ingreso esperado (baseCurrency)

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => BudgetLine, (line) => line.budget, { cascade: true })
  lines: BudgetLine[];
}
