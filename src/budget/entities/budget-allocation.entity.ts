import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Check,
} from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { BudgetPeriod } from './budget-period.entity';
import { Ministry } from '../../ministries/entities/ministry.entity';
import { TransactionCategory } from '../../treasury/entities/transaction-category.entity';
import { TransactionType } from '../../treasury/enums/treasury.enums';

@Entity('budget_allocations')
@Index(['churchId', 'budgetPeriodId'])
@Index(['churchId', 'ministryId'])
@Index(['churchId', 'categoryId'])
@Index(['churchId', 'budgetPeriodId', 'ministryId'])
@Index(['churchId', 'budgetPeriodId', 'categoryId'])
@Index(['churchId', 'budgetPeriodId', 'ministryId', 'categoryId', 'type'], {
  unique: true,
})
@Check(`"amountBaseCurrency" > 0`)
@Check(`("ministryId" IS NOT NULL OR "categoryId" IS NOT NULL)`)
export class BudgetAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  churchId: string;

  @ManyToOne(() => Church, { nullable: false })
  @JoinColumn({ name: 'churchId' })
  church: Church;

  @Column({ nullable: false })
  budgetPeriodId: string;

  @ManyToOne(() => BudgetPeriod, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'budgetPeriodId' })
  budgetPeriod: BudgetPeriod;

  @Column({ nullable: true })
  ministryId: string;

  @ManyToOne(() => Ministry, { nullable: true })
  @JoinColumn({ name: 'ministryId' })
  ministry: Ministry;

  @Column({ nullable: true })
  categoryId: string;

  @ManyToOne(() => TransactionCategory, { nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: TransactionCategory;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column('decimal', { precision: 15, scale: 2, nullable: false })
  amountBaseCurrency: number;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
