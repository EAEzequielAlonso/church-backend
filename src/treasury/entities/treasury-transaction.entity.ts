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
@Index(['churchId', 'date'])
@Index(['churchId', 'type', 'date'])
@Index(['churchId', 'categoryId', 'date'])
@Index(['churchId', 'sourceAccountId', 'date'])
@Index(['churchId', 'destinationAccountId', 'date'])
@Index(['churchId', 'ministryId', 'date'])
export class TreasuryTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  churchId: string;

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

  @Column({ nullable: true })
  sourceAccountId: string;

  @ManyToOne(() => Account, (acc) => acc.outgoingTransactions, {
    nullable: true,
  })
  @JoinColumn({ name: 'sourceAccountId' })
  sourceAccount: Account; // Required for EXPENSE, TRANSFER

  @Column({ nullable: true })
  destinationAccountId: string;

  @ManyToOne(() => Account, (acc) => acc.incomingTransactions, {
    nullable: true,
  })
  @JoinColumn({ name: 'destinationAccountId' })
  destinationAccount: Account; // Required for INCOME, TRANSFER

  @Column({ nullable: true })
  categoryId: string;

  @ManyToOne(() => TransactionCategory, { nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: TransactionCategory; // Required for INCOME, EXPENSE. Null for TRANSFER.

  @Column({ nullable: true })
  ministryId: string;

  @ManyToOne(() => Ministry, { nullable: true })
  @JoinColumn({ name: 'ministryId' })
  ministry: Ministry; // Optional

  // --- Status & Integrity ---

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.COMPLETED,
  })
  status: TransactionStatus;

  // --- Correction Tracking ---

  @Column({ type: 'uuid', nullable: true })
  correctedTransactionId: string | null; // FK to the original tx being corrected

  @Column({ default: false })
  isCorrection: boolean; // true if this tx is a reversal or correction entry

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
