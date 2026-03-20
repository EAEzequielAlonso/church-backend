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
import { Currency } from '../../treasury/enums/treasury.enums';

export enum BudgetPeriodType {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
  QUARTERLY = 'QUARTERLY',
  CUSTOM = 'CUSTOM',
  PROJECT = 'PROJECT',
}

export enum BudgetPeriodStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

@Entity('budget_periods')
@Index(['churchId', 'startDate'])
@Index(['churchId', 'type'])
@Index(['churchId', 'startDate', 'endDate'])
@Check(`"startDate" <= "endDate"`)
export class BudgetPeriod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  churchId: string;

  @ManyToOne(() => Church, { nullable: false })
  @JoinColumn({ name: 'churchId' })
  church: Church;

  @Column({ nullable: false })
  name: string;

  @Column({ type: 'enum', enum: BudgetPeriodType })
  type: BudgetPeriodType;

  @Column({
    type: 'enum',
    enum: BudgetPeriodStatus,
    default: BudgetPeriodStatus.ACTIVE,
  })
  status: BudgetPeriodStatus;

  @Column({ type: 'date', nullable: false })
  startDate: Date;

  @Column({ type: 'date', nullable: false })
  endDate: Date;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'enum', enum: Currency, default: Currency.ARS })
  currency: Currency;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
