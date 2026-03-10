import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Budget } from './budget.entity';
import { Ministry } from '../../ministries/entities/ministry.entity';
import { TransactionCategory } from './transaction-category.entity';
import { BudgetLineType } from '../enums/treasury.enums';

@Entity('budget_lines')
@Index(['type', 'ministryId', 'categoryId'])
export class BudgetLine {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Budget, (b) => b.lines, { onDelete: 'CASCADE' })
    budget: Budget;

    @Column({ type: 'enum', enum: BudgetLineType })
    type: BudgetLineType;

    @Column('uuid', { nullable: true })
    ministryId: string | null;

    @Column('uuid', { nullable: true })
    categoryId: string | null;

    @Column('decimal', { precision: 15, scale: 2 })
    budgetedAmount: number; // Always in baseCurrency

    // Relations — NO CASCADE on delete (lines survive ministry/category deletion)
    @ManyToOne(() => Ministry, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'ministryId' })
    ministry: Ministry;

    @ManyToOne(() => TransactionCategory, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'categoryId' })
    category: TransactionCategory;
}
