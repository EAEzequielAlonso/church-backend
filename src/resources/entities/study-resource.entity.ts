import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { Book } from '../../library/entities/book.entity';
import { ResourceType } from '../enums/resource.enums';

@Entity('study_resources')
@Index(['churchId'])
export class StudyResource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  churchId: string;

  @ManyToOne(() => Church, { nullable: false })
  @JoinColumn({ name: 'churchId' })
  church: Church;

  @Column()
  title: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: ResourceType, default: ResourceType.LINK })
  type: ResourceType;

  @Column({ nullable: true })
  url: string;

  @Column({ nullable: true })
  libraryBookId: string;

  @ManyToOne(() => Book, { nullable: true })
  @JoinColumn({ name: 'libraryBookId' })
  libraryBook: Book;

  @Column({ nullable: true })
  thumbnail: string;

  @CreateDateColumn()
  createdAt: Date;
}
