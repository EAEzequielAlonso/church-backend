import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Unique } from 'typeorm';
import { ChurchMember } from '../../members/entities/church-member.entity';
import { SmallGroup } from './small-group.entity';
import { SmallGroupRole } from '../../common/enums';

@Entity('small_group_members')
@Unique(['group', 'member'])
export class SmallGroupMember {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => ChurchMember, { nullable: false, onDelete: 'CASCADE' })
    member: ChurchMember;

    @ManyToOne(() => SmallGroup, (group) => group.members, { nullable: false, onDelete: 'CASCADE' })
    group: SmallGroup;

    @Column({
        type: 'enum',
        enum: SmallGroupRole,
        default: SmallGroupRole.PARTICIPANT
    })
    role: SmallGroupRole;

    @CreateDateColumn()
    joinedAt: Date;
}
