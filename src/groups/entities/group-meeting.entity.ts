import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  JoinColumn,
  Column,
  OneToOne,
} from 'typeorm';
import { Group } from './group.entity';
import { GroupAttendance } from './group-attendance.entity';
import { CalendarEvent } from '../../agenda/entities/calendar-event.entity';

@Entity('group_meetings')
@Index(['groupId'])
export class GroupMeeting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Group, (group) => group.meetings, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @Column({ nullable: false })
  groupId: string;

  @Column({ type: 'uuid', nullable: true })
  calendarEventId: string;

  @OneToOne(() => CalendarEvent, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'calendarEventId' })
  calendarEvent: CalendarEvent;

  @OneToMany(() => GroupAttendance, (attendance) => attendance.meeting)
  attendances: GroupAttendance[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
