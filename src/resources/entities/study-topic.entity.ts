import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable, JoinColumn, Index } from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { StudyResource } from './study-resource.entity';

@Entity('study_topics')
@Index(['churchId', 'order'])
export class StudyTopic {
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

  @ManyToMany(() => StudyResource, { eager: false })
  @JoinTable({
    name: 'study_topic_resources',
    joinColumn: { name: 'topicId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'resourceId', referencedColumnName: 'id' },
  })
  resources: StudyResource[];
}
