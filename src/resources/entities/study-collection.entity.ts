import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable, JoinColumn, Index } from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { StudyTopic } from './study-topic.entity';

@Entity('study_collections')
@Index(['churchId', 'order'])
export class StudyCollection {
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

  @Column({ type: 'int', default: 0 })
  order: number;

  @ManyToMany(() => StudyTopic, { eager: false })
  @JoinTable({
    name: 'study_collection_topics',
    joinColumn: { name: 'collectionId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'topicId', referencedColumnName: 'id' },
  })
  topics: StudyTopic[];
}
