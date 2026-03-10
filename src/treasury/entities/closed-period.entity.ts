import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToMany,
    CreateDateColumn,
    JoinColumn,
    Index,
    Unique,
} from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { PeriodAccountSnapshot } from './period-account-snapshot.entity';

@Entity('closed_periods')
@Unique(['churchId', 'year', 'month'])
export class ClosedPeriod {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    churchId: string;

    @ManyToOne(() => Church)
    @JoinColumn({ name: 'churchId' })
    church: Church;

    @Column('int')
    year: number;

    @Column('int')
    month: number;

    // --- State ---

    @Column({ default: true })
    isClosed: boolean;

    // --- Period Totals (in baseCurrency) ---

    @Column('decimal', { precision: 18, scale: 2, default: 0 })
    totalIncome: number;

    @Column('decimal', { precision: 18, scale: 2, default: 0 })
    totalExpense: number;

    @Column('decimal', { precision: 18, scale: 2, default: 0 })
    netResult: number;

    // --- Audit ---

    @Column()
    closedById: string;

    @CreateDateColumn()
    closedAt: Date;

    @Column({ nullable: true })
    reopenedById: string;

    @Column({ type: 'timestamp', nullable: true })
    reopenedAt: Date;

    @Column({ nullable: true })
    reopenReason: string;

    // --- Relationships ---

    @OneToMany(() => PeriodAccountSnapshot, (s) => s.closedPeriod, {
        cascade: true,
    })
    accountSnapshots: PeriodAccountSnapshot[];
}
