import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, OneToOne, OneToMany } from 'typeorm';
import { Course } from './course.entity';
import { CalendarEvent } from '../../agenda/entities/calendar-event.entity';
import { SessionAttendance } from './session-attendance.entity';

@Entity('course_sessions')
export class CourseSession {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Course, (course) => course.sessions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'course_id' })
    course: Course;

    @Column({ type: 'date' })
    date: Date;

    @Column({ type: 'time' })
    startTime: string; // HH:mm

    @Column({ nullable: true })
    estimatedDuration: number; // minutes

    @Column()
    topic: string;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @CreateDateColumn()
    createdAt: Date;

    @OneToOne(() => CalendarEvent, (event) => event.session, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'calendar_event_id' })
    event: CalendarEvent;

    @OneToMany(() => SessionAttendance, (attendance) => attendance.session)
    attendances: SessionAttendance[];
}
