import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn, Check } from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { Currency } from '../../treasury/enums/treasury.enums';

export enum BudgetPeriodType {
    MONTHLY = 'MONTHLY',
    YEARLY = 'YEARLY',
}

@Entity('budget_periods')
@Index(['church', 'startDate'])
@Index(['church', 'type'])
@Index(['church', 'startDate', 'endDate'])
@Check(`"startDate" <= "endDate"`)
export class BudgetPeriod {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Church, { nullable: false })
    @JoinColumn({ name: 'churchId' })
    church: Church;

    @Column({ nullable: false })
    name: string;

    @Column({ type: 'enum', enum: BudgetPeriodType })
    type: BudgetPeriodType;

    @Column({ type: 'date', nullable: false })
    startDate: Date;

    @Column({ type: 'date', nullable: false })
    endDate: Date;

    @Column({ type: 'enum', enum: Currency, default: Currency.ARS })
    currency: Currency;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
