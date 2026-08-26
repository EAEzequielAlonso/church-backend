import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MissionReport } from './mission-report.entity';

@Entity('mission_report_media')
@Index(['missionReportId', 'order'])
export class MissionReportMedia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  missionReportId: string;

  @ManyToOne(() => MissionReport, (report) => report.media, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'missionReportId' })
  missionReport: MissionReport;

  @Column('text')
  url: string;

  @Column('int', { default: 0 })
  order: number;

  @Column('text', { nullable: true })
  observation: string;
}
