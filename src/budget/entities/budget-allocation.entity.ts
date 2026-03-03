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

@Entity('budget_allocations')
@Index(['church', 'budgetPeriod'])
@Index(['church', 'ministry'])
@Index(['church', 'category'])
@Index(['church', 'budgetPeriod', 'ministry'])
@Index(['church', 'budgetPeriod', 'category'])
@Index(['church', 'budgetPeriod', 'ministry', 'category'], { unique: true }) // Prevent duplicate allocations
@Check(`"amountBaseCurrency" > 0`)
@Check(`("ministryId" IS NOT NULL OR "categoryId" IS NOT NULL)`) // At least one must be present
export class BudgetAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Church, { nullable: false })
  @JoinColumn({ name: 'churchId' })
  church: Church;

  @ManyToOne(() => BudgetPeriod, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'budgetPeriodId' })
  budgetPeriod: BudgetPeriod;

  @ManyToOne(() => Ministry, { nullable: true })
  @JoinColumn({ name: 'ministryId' })
  ministry: Ministry;

  @ManyToOne(() => TransactionCategory, { nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: TransactionCategory;

  @Column('decimal', { precision: 15, scale: 2, nullable: false })
  amountBaseCurrency: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
