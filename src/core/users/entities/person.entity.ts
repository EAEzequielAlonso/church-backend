import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { MaritalStatus, Sex } from '../enums/person.enum';
import { ChurchFollow } from 'src/public/church/entities/follower.entity';
import { PublicActivity } from 'src/public/church/entities/public-activity.entity';
import { SmallGroup } from 'src/public/small-groups/entities/small-group.entity';

@Entity('persons')
export class Person {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ type: 'text', nullable: true })
  avatarUrl: string;

  @Column({ nullable: true, type: 'date' })
  birthDate: Date;

  @Column({
    type: 'enum',
    enum: Sex,
    nullable: true,
  })
  sex: Sex;

  @Column({ nullable: true })
  nationality: string;

  // Direccion
  @Column({ nullable: true })
  neighborhood: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  postalCode: string;

  @Column({ nullable: true })
  country: string;

  // 👨‍👩‍👧‍👦
  @Column({
    type: 'enum',
    enum: MaritalStatus,
    nullable: true,
  })
  maritalStatus: MaritalStatus;

  // 🧑‍💼
  @Column({ nullable: true })
  occupation: string;

  // 📌 Flags
  @Column({ default: false })
  isBaptized: boolean;

  @Column({ default: true })
  isActive: boolean;

  // 🌐 Public Profile (Telyon Network)
  @Column({ unique: true, nullable: true })
  slug: string;

  @Column({ default: false })
  isPublicProfileEnabled: boolean;

  // 🔐 Relaciones
  @OneToOne(() => User, (user) => user.person, { nullable: true })
  user: User;

  @OneToMany(() => PublicActivity, (activity) => activity.responsiblePerson)
  publicActivities: PublicActivity[];

  @OneToMany(() => ChurchFollow, (follow) => follow.person)
  followedChurches: ChurchFollow[];

  @OneToMany(() => SmallGroup, (group) => group.leader)
  ledSmallGroups: SmallGroup[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

}
