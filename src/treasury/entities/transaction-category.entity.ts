import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index, JoinColumn, Unique } from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { TransactionType } from '../enums/treasury.enums';

@Entity('transaction_categories')
@Index(['church', 'type']) // Common query: Categories by type
@Unique(['church', 'type', 'name']) // PREVENT DUPLICATES
export class TransactionCategory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Church, { nullable: false })
    @JoinColumn({ name: 'churchId' })
    church: Church;

    @Column()
    name: string;

    @Column({ type: 'enum', enum: TransactionType })
    type: TransactionType; // INCOME or EXPENSE only (validated in service)

    @Column({ nullable: true })
    parentCategoryId: string; // Adjacency list for subcategories

    @Column({ nullable: true })
    color: string;

    @Column({ nullable: true })
    icon: string;

    @CreateDateColumn()
    createdAt: Date;
}
