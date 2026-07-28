import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
  Column,
} from 'typeorm';

import { Person } from 'src/core/users/entities/person.entity';
import { ChurchPublicProfile } from './church_public_profile.entity';

@Entity('church_follow')
@Unique(['profileChurch', 'person'])
export class ChurchFollow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ChurchPublicProfile, (church) => church.followers, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'profile_church_id' })
  profileChurch: ChurchPublicProfile;
  @Column({ type: 'uuid' })
  profileChurchId: string;

  @ManyToOne(() => Person, (person) => person.followedChurches, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'person_id' })
  person: Person;
  @Column({ type: 'uuid' })
  personId: string;

  @CreateDateColumn({
    name: 'followed_at',
  })
  followedAt: Date;
}
