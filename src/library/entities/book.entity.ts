import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  DeleteDateColumn,
  JoinColumn,
} from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { ChurchPerson } from '../../members/entities/church-person.entity';
import { BookOwnershipType, BookStatus } from '../enums/library.enums';
import { BookCategory } from './book-category.entity';

@Entity('books')
@Index(['churchId', 'title'])
@Index(['churchId', 'status'])
@Index(['churchId', 'categoryId'])
export class Book {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  author: string;

  @ManyToOne(() => BookCategory, { nullable: true })
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

  /**
   * CHURCH = institucional (gestionado por LIBRARIAN)
   * MEMBER = personal (gestionado por el dueño)
   * Source of truth for ownership. isChurchOwned has been removed.
   */
  @Column({
    type: 'enum',
    enum: BookOwnershipType,
    default: BookOwnershipType.CHURCH,
  })
  ownershipType: BookOwnershipType;

  @Column({
    type: 'enum',
    enum: BookStatus,
    default: BookStatus.AVAILABLE,
  })
  status: BookStatus;

  /**
   * Only set when ownershipType = MEMBER.
   * Must be null for CHURCH books.
   */
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
