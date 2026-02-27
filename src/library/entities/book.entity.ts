import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index, DeleteDateColumn, JoinColumn } from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { ChurchPerson } from '../../members/entities/church-person.entity';
import { BookOwnershipType, BookStatus } from '../../common/enums/library.enums';
import { BookCategory } from './book-category.entity';

@Entity('books')
@Index(['church', 'title'])
@Index(['church', 'status'])
@Index(['church', 'category']) // FK index
export class Book {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column()
    author: string;

    // OLD: @Column({ nullable: true }) category: string; 
    // MIGRATION NOTE: Old string categories must be migrated. For now, we add the relation.

    @ManyToOne(() => BookCategory, { nullable: true }) // Nullable for migration/transition
    @JoinColumn({ name: 'categoryId' })
    category: BookCategory;

    @Column({ nullable: true })
    categoryId: string;

    @Column({ nullable: true, type: 'text' })
    description: string;

    @Column({ nullable: true })
    isbn: string;

    @Column({ nullable: true })
    coverUrl: string;

    @Column({
        type: 'enum',
        enum: BookOwnershipType,
        default: BookOwnershipType.CHURCH
    })
    ownershipType: BookOwnershipType;

    @Column({ default: true })
    isChurchOwned: boolean;

    // Computed status via Loans, but kept for cache/quick access if synced transactionally
    @Column({
        type: 'enum',
        enum: BookStatus,
        default: BookStatus.AVAILABLE
    })
    status: BookStatus;

    @ManyToOne(() => ChurchPerson, { nullable: true })
    @JoinColumn({ name: 'ownerMemberId' })
    ownerMember: ChurchPerson;

    @Column({ nullable: true })
    ownerMemberId: string;

    @Column({ nullable: true })
    code: string;

    @Column({ nullable: true, type: 'text' })
    condition: string;

    @Column({ nullable: true })
    location: string;

    @ManyToOne(() => Church, { nullable: false })
    @JoinColumn({ name: 'churchId' })
    church: Church;

    @Column()
    churchId: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt: Date;
}
