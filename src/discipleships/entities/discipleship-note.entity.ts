import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Discipleship } from './discipleship.entity';
import { DiscipleshipMeeting } from './discipleship-meeting.entity';
import { ChurchPerson } from '../../members/entities/church-person.entity';
import { DiscipleshipNoteType } from '../../common/enums';

@Entity('discipleship_notes')
export class DiscipleshipNote {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Discipleship, (discipleship) => discipleship.notes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'discipleship_id' })
    discipleship: Discipleship;

    @ManyToOne(() => DiscipleshipMeeting, (meeting) => meeting.notes, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'meeting_id' })
    meeting: DiscipleshipMeeting;

    @ManyToOne(() => ChurchPerson, { nullable: false })
    @JoinColumn({ name: 'author_id' })
    author: ChurchPerson;

    @Column({
        type: 'enum',
        enum: DiscipleshipNoteType,
        default: DiscipleshipNoteType.PRIVATE
    })
    type: DiscipleshipNoteType;

    @Column({ nullable: true })
    title: string;

    @Column({ type: 'text' })
    content: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
