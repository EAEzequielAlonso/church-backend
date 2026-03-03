import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { Account } from './account.entity';
import { Ministry } from '../../ministries/entities/ministry.entity';
import { TransactionCategory } from './transaction-category.entity';
import {
  TransactionStatus,
  TransactionType,
  Currency,
} from '../enums/treasury.enums';

@Entity('treasury_transactions')
// MANDATORY Indexes for Reporting Performance
@Index(['church', 'date'])
@Index(['church', 'type', 'date'])
@Index(['church', 'category', 'date'])
@Index(['church', 'sourceAccount', 'date'])
@Index(['church', 'destinationAccount', 'date'])
@Index(['church', 'ministry', 'date'])
export class TreasuryTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Church, { nullable: false })
  @JoinColumn({ name: 'churchId' })
  church: Church;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType; // INCOME | EXPENSE | TRANSFER

  @Column({ nullable: false })
  description: string;

  // --- Amounts & Currency ---

  @Column('decimal', { precision: 18, scale: 2, nullable: false })
  amount: number; // Original Currency

  @Column('decimal', { precision: 18, scale: 2, nullable: false })
  amountBaseCurrency: number; // Calculated: amount * exchangeRate

  @Column({ type: 'enum', enum: Currency })
  currency: Currency;

  @Column('decimal', { precision: 18, scale: 8, default: 1, nullable: false })
  exchangeRate: number;

  // --- Relationships ---

  @ManyToOne(() => Account, (acc) => acc.outgoingTransactions, {
    nullable: true,
  })
  sourceAccount: Account; // Required for EXPENSE, TRANSFER

  @ManyToOne(() => Account, (acc) => acc.incomingTransactions, {
    nullable: true,
  })
  destinationAccount: Account; // Required for INCOME, TRANSFER

  @ManyToOne(() => TransactionCategory, { nullable: true })
  category: TransactionCategory; // Required for INCOME, EXPENSE. Null for TRANSFER.

  @ManyToOne(() => Ministry, { nullable: true })
  ministry: Ministry; // Optional

  // --- Status & Integrity ---

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.COMPLETED,
  })
  status: TransactionStatus;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  balanceAfter: number; // Integrity Check: Balance of the primary account after this tx

  @Column({ nullable: true })
  reference: string; // External ref number

  @Column({ nullable: true })
  createdById: string; // Audit

  // --- Timestamps ---

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  date: Date; // Transaction Date

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
