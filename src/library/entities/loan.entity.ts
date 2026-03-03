import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Book } from './book.entity';
import { ChurchPerson } from '../../members/entities/church-person.entity';
import { LoanStatus } from '../enums/library.enums';
import { Church } from '../../churches/entities/church.entity';

@Entity('loans')
@Index(['churchId', 'status'])
@Index(['churchId', 'borrowerId'])
@Index(['churchId', 'bookId'])
export class Loan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Book, { nullable: false })
  @JoinColumn({ name: 'bookId' })
  book: Book;

  @Column({ nullable: false })
  bookId: string;

  @ManyToOne(() => ChurchPerson, { nullable: false })
  @JoinColumn({ name: 'borrowerId' })
  borrower: ChurchPerson;

  @Column({ nullable: false })
  borrowerId: string;

  /**
   * Multi-tenancy enforcement: Loan always belongs to a church.
   * NOT nullable — a loan without a church is invalid.
   */
  @ManyToOne(() => Church, { nullable: false })
  @JoinColumn({ name: 'churchId' })
  church: Church;

  @Column({ nullable: false })
  churchId: string;

  // ── Workflow dates ───────────────────────────────────────────────────────

  @Column({ nullable: true })
  requestedAt: Date;

  @Column({ nullable: true })
  approvedAt: Date;

  @Column({ nullable: true })
  deliveredAt: Date;

  @Column({ nullable: true })
  dueDate: Date;

  @Column({ nullable: true })
  returnedAt: Date;

  // ── Conditions ───────────────────────────────────────────────────────────

  @Column({ nullable: true, type: 'text' })
  conditionAtLoan: string;

  @Column({ nullable: true, type: 'text' })
  conditionAtReturn: string;

  // ── Audit actors (memberId of who acted) ─────────────────────────────────

  @Column({ nullable: true })
  approvedByUserId: string;

  @Column({ nullable: true })
  deliveredByUserId: string;

  @Column({ nullable: true })
  returnedConfirmedByUserId: string;

  // ── Status ───────────────────────────────────────────────────────────────

  @Column({
    type: 'enum',
    enum: LoanStatus,
    default: LoanStatus.REQUESTED,
  })
  status: LoanStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
