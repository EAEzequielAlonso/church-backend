import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Book } from './book.entity';
import { ChurchPerson } from '../../members/entities/church-person.entity';
import { LoanStatus } from '../../common/enums/library.enums';
import { Church } from '../../churches/entities/church.entity'; // Assuming Church entity import

@Entity('loans')
@Index(['church', 'status'])
@Index(['church', 'borrower'])
@Index(['church', 'book'])
export class Loan {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Book, { nullable: false })
    @JoinColumn({ name: 'bookId' })
    book: Book;

    @Column()
    bookId: string;

    @ManyToOne(() => ChurchPerson, { nullable: false })
    @JoinColumn({ name: 'borrowerId' })
    borrower: ChurchPerson;

    @Column()
    borrowerId: string;

    // Workflow Dates
    @Column({ nullable: true })
    requestedAt: Date; // Formerly outDate? No, outDate usually meant start of loan. 
    // We map: requestedAt -> creation, approvedAt -> approval, deliveredAt -> start of physical loan

    @Column({ nullable: true })
    approvedAt: Date;

    @Column({ nullable: true })
    deliveredAt: Date;

    @Column({ nullable: true })
    dueDate: Date;

    @Column({ nullable: true })
    returnedAt: Date;

    // Conditions
    @Column({ nullable: true, type: 'text' })
    conditionAtLoan: string;

    @Column({ nullable: true, type: 'text' })
    conditionAtReturn: string;

    // Audit / Actors
    @Column({ nullable: true }) // User ID
    approvedByUserId: string;

    @Column({ nullable: true }) // User ID
    deliveredByUserId: string;

    @Column({ nullable: true }) // User ID
    returnedConfirmedByUserId: string;

    @Column({
        type: 'enum',
        enum: LoanStatus,
        default: LoanStatus.REQUESTED
    })
    status: LoanStatus;

    @ManyToOne(() => Church, { nullable: true }) // Should be strict, but nullable for migration if needed
    @JoinColumn({ name: 'churchId' })
    church: Church; // Enforce multi-tenancy on loans too for faster filtering

    @Column({ nullable: true })
    churchId: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
