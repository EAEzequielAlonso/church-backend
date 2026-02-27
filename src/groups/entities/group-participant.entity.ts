import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Unique, Index } from 'typeorm';
import { Group } from './group.entity';
import { ChurchPerson } from '../../members/entities/church-person.entity';
import { GroupRole } from '../enums/group.enums';

@Entity('group_participants')
@Unique(['groupId', 'churchPersonId'])
@Index(['groupId'])
@Index(['churchPersonId', 'role'])
export class GroupParticipant {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Group, group => group.participants, { nullable: false, onDelete: 'CASCADE' })
    group: Group;

    @Column({ nullable: false })
    groupId: string;

    @ManyToOne(() => ChurchPerson, { nullable: false, onDelete: 'CASCADE' })
    churchPerson: ChurchPerson;

    @Column({ nullable: false })
    churchPersonId: string;

    @Column({
        type: 'enum',
        enum: GroupRole,
        default: GroupRole.MEMBER
    })
    role: GroupRole;

    @CreateDateColumn()
    joinedAt: Date;
}
