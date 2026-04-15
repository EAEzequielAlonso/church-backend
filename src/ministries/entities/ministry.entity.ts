import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Church } from '../../churches/entities/church.entity';
import { MinistryMember } from './ministry-member.entity';
import { ChurchPerson } from '../../members/entities/church-person.entity';
import { MinistryTask } from './ministry-task.entity';
import { ServiceDuty } from './service-duty.entity';
import { MinistryRoleAssignment } from './ministry-role-assignment.entity';
import { MinistryMeeting } from './ministry-meeting.entity';

@Entity('ministries')
export class Ministry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  color: string;

  @Column({ default: 'active' })
  status: 'active' | 'inactive';

  @Column({ nullable: true })
  leaderId: string;

  @ManyToOne(() => ChurchPerson, { nullable: true })
  @JoinColumn({ name: 'leaderId' })
  leader: ChurchPerson; // Main leader reference

  @ManyToOne(() => Church, (church) => church.ministries)
  @JoinColumn({ name: 'churchId' })
  church: Church;
  @Column()
  churchId: string;

  @OneToMany(() => MinistryMember, (mm) => mm.ministry)
  members: MinistryMember[];

  @OneToMany(() => MinistryTask, (task) => task.ministry)
  tasks: MinistryTask[];

  @OneToMany(() => MinistryMeeting, (meeting) => meeting.ministry)
  meetings: MinistryMeeting[];

  @OneToMany(() => ServiceDuty, (duty) => duty.ministry)
  serviceDuties: ServiceDuty[];

  @OneToMany(() => MinistryRoleAssignment, (assignment) => assignment.ministry)
  assignments: MinistryRoleAssignment[];
}
