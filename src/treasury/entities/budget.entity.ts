import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { Ministry } from '../../ministries/entities/ministry.entity';
import { TransactionCategory } from './transaction-category.entity';

@Entity('budgets')
export class Budget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Church)
  church: Church;

  @ManyToOne(() => Ministry)
  ministry: Ministry;

  @ManyToOne(() => TransactionCategory)
  category: TransactionCategory;

  @Column('decimal', { precision: 15, scale: 2 })
  amountLimit: number; // Monthly? Yearly? Let's assume Monthly for MVP

  @Column()
  period: string; // 'monthly', 'yearly', 'event'

  @Column('int')
  year: number;
}
