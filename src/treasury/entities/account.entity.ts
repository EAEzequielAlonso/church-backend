import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { TreasuryTransaction } from './treasury-transaction.entity';
import { AccountType, Currency } from '../enums/treasury.enums';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: AccountType })
  type: AccountType;

  @Column({ type: 'enum', enum: Currency, default: Currency.ARS })
  currency: Currency;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  balance: number;

  @Column()
  @Index()
  churchId: string;

  @ManyToOne(() => Church, (church) => church.accounts)
  @JoinColumn({ name: 'churchId' })
  church: Church;

  @OneToMany(() => TreasuryTransaction, (tx) => tx.sourceAccount)
  outgoingTransactions: TreasuryTransaction[];

  @OneToMany(() => TreasuryTransaction, (tx) => tx.destinationAccount)
  incomingTransactions: TreasuryTransaction[];
}
