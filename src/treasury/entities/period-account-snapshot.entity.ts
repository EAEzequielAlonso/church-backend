import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ClosedPeriod } from './closed-period.entity';
import { Account } from './account.entity';
import { Currency } from '../enums/treasury.enums';

@Entity('period_account_snapshots')
export class PeriodAccountSnapshot {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    closedPeriodId: string;

    @Exclude()
    @ManyToOne(() => ClosedPeriod, (p) => p.accountSnapshots, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'closedPeriodId' })
    closedPeriod: ClosedPeriod;

    @Column()
    accountId: string;

    @ManyToOne(() => Account)
    @JoinColumn({ name: 'accountId' })
    account: Account;

    @Column()
    accountName: string;

    @Column({ type: 'enum', enum: Currency })
    currency: Currency;

    // --- Balance at close (in account's own currency) ---

    @Column('decimal', { precision: 18, scale: 2, default: 0 })
    balanceAtClose: number;

    @Column('decimal', { precision: 18, scale: 2, default: 0 })
    balanceAtCloseBaseCurrency: number;

    // --- Period movements (in account's own currency) ---

    @Column('decimal', { precision: 18, scale: 2, default: 0 })
    periodIncome: number;

    @Column('decimal', { precision: 18, scale: 2, default: 0 })
    periodExpense: number;

    @Column('decimal', { precision: 18, scale: 2, default: 0 })
    periodTransferIn: number;

    @Column('decimal', { precision: 18, scale: 2, default: 0 })
    periodTransferOut: number;
}
