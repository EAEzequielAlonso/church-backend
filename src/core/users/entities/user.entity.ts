import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Person } from './person.entity';
import { SystemRole } from '../../../common/enums';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false, nullable: true })
  password: string;

  @Column({ default: false })
  isOnboarded: boolean;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true })
  verificationCode: string;

  @Column({ type: 'timestamp', nullable: true })
  verificationCodeExpiresAt: Date;

  @Column({ nullable: true })
  resetPasswordToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpiresAt: Date | null;

  @Column({
    type: 'enum',
    enum: SystemRole,
    default: SystemRole.USER,
  })
  systemRole: SystemRole;

  @Column({ default: 'local' })
  provider: string;

  @OneToOne(() => Person, (person) => person.user, {
    cascade: true,
    nullable: true,
  })
  @JoinColumn({ name: 'personId' })
  person: Person;
  @Column({ nullable: true })
  personId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
