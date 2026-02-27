import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable, CreateDateColumn, UpdateDateColumn, OneToOne } from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { Person } from '../../users/entities/person.entity';
import { Ministry } from '../../ministries/entities/ministry.entity';
import { Group } from '../../groups/entities/group.entity';
import { MeetingNote } from '../../ministries/entities/meeting-note.entity';
import { CalendarEventType, MinistryEventType } from '../../common/enums';
import { DiscipleshipMeeting } from '../../discipleships/entities/discipleship-meeting.entity';

@Entity('calendar_events')
export class CalendarEvent {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column({ nullable: true, type: 'text' })
    description: string;

    @Column({ type: 'timestamp' })
    startDate: Date;

    @Column({ type: 'timestamp' })
    endDate: Date;

    @Column({ nullable: true })
    location: string;

    @Column({
        type: 'enum',
        enum: CalendarEventType,
        default: CalendarEventType.OTHER
    })
    type: CalendarEventType;

    @Column({
        type: 'enum',
        enum: MinistryEventType,
        nullable: true
    })
    ministryEventType: MinistryEventType;

    @Column({ nullable: true })
    color: string; // For UI customization

    @Column({ default: false })
    isAllDay: boolean;

    // 🔗 Relations

    @ManyToOne(() => Church, (church) => church.calendarEvents)
    church: Church;

    // For PERSONAL events or "created by"
    @ManyToOne(() => Person, { nullable: true })
    organizer: Person;

    // For MINISTRY events
    @ManyToOne(() => Ministry, { nullable: true })
    ministry: Ministry;

    // For GROUP events (formerly small groups/courses)
    @ManyToOne(() => Group, { nullable: true })
    group: Group;

    // Specific assignments (e.g. Preacher for a Sunday) or Attendees
    @ManyToMany(() => Person)
    @JoinTable({ name: 'calendar_event_attendees' })
    attendees: Person[];

    @OneToOne(() => MeetingNote, (note) => note.event)
    meetingNote: MeetingNote;

    @OneToOne(() => DiscipleshipMeeting, (meeting) => meeting.calendarEvent)
    discipleshipMeeting: DiscipleshipMeeting;



    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
