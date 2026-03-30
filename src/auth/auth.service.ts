import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { Person } from '../users/entities/person.entity';
import { Church } from '../churches/entities/church.entity';
import { ChurchPerson } from '../members/entities/church-person.entity';
import { JoinRequest } from '../members/entities/join-request.entity';
import {
  RegisterChurchDto,
  LoginDto,
  RegisterUserDto,
} from './dto/dto';
import { SocialLoginDto } from './dto/social-login.dto';
import {
  EcclesiasticalRole,
  FunctionalRole,
  PlanType,
  SubscriptionStatus,
  SystemRole,
} from '../common/enums';
import { MembershipStatus } from '../members/enums/membership-status.enum';
import { JwtPayload } from './interfaces';
import { EmailService } from './email.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Person) private personRepository: Repository<Person>,
    @InjectRepository(Church) private churchRepository: Repository<Church>,
    @InjectRepository(ChurchPerson)
    private memberRepository: Repository<ChurchPerson>,
    @InjectRepository(JoinRequest)
    private joinRequestRepository: Repository<JoinRequest>,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) { }

  // ==========================================
  // REGISTER CHURCH (founder flow)
  // ==========================================
  async registerChurch(dto: RegisterChurchDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    if (dto.churchSlug) {
      const existingSlug = await this.churchRepository.findOne({
        where: { slug: dto.churchSlug },
      });
      if (existingSlug) {
        throw new BadRequestException('Church slug is taken');
      }
    }

    // Create Church
    const church = this.churchRepository.create({
      name: dto.churchName,
      slug: dto.churchSlug || this.generateSlug(dto.churchName),
      plan: PlanType.TRIAL,
      subscriptionStatus: SubscriptionStatus.TRIAL,
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    });
    const savedChurch = await this.churchRepository.save(church);

    // Create Person
    const person = this.personRepository.create({
      email: dto.email,
      fullName: dto.fullName,
    });
    const savedPerson = await this.personRepository.save(person);

    // Create User
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const verificationCode = this.generateVerificationCode();

    const user = this.userRepository.create({
      email: dto.email,
      password: hashedPassword,
      systemRole: SystemRole.USER,
      person: savedPerson,
      verificationCode,
      verificationCodeExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });
    await this.userRepository.save(user);

    this.emailService.sendVerificationCode(user.email, verificationCode);

    // Create ChurchPerson (Admin founder)
    const member = this.memberRepository.create({
      person: savedPerson,
      church: savedChurch,
      ecclesiasticalRole: EcclesiasticalRole.PASTOR,
      functionalRoles: [
        FunctionalRole.ADMIN_CHURCH,
        FunctionalRole.AUDITOR,
        FunctionalRole.COUNSELOR,
        FunctionalRole.MINISTRY_LEADER,
      ],
      membershipStatus: MembershipStatus.MEMBER,
    });
    await this.memberRepository.save(member);

    return this.login({
      email: dto.email,
      password: dto.password,
      churchSlug: savedChurch.slug,
    });
  }

  // ==========================================
  // REGISTER USER (solo usuario, sin iglesia)
  // ==========================================
  async registerUser(dto: RegisterUserDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    let person: Person;

    // Check if registering via invite link
    if (dto.inviteToken) {
      person = await this.personRepository.findOne({
        where: { inviteToken: dto.inviteToken },
        relations: ['user'],
      });

      if (!person) {
        throw new BadRequestException('Token de invitación inválido');
      }
      if (person.user) {
        throw new BadRequestException('Esta invitación ya ha sido utilizada');
      }

      person.email = dto.email;
      if (dto.fullName) person.fullName = dto.fullName;
      person.inviteToken = null;
      await this.personRepository.save(person);
    } else {
      // AUTO-LINK: Check if Person exists by email (offline person)
      person = await this.personRepository.findOne({
        where: { email: dto.email },
        relations: ['user', 'memberships'],
      });

      if (person && person.user) {
        throw new BadRequestException('User with this email already exists');
      }

      if (!person) {
        person = this.personRepository.create({
          email: dto.email,
          fullName: dto.fullName || 'Usuario',
        });
        person = await this.personRepository.save(person);
      }
    }

    // Create User
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    // If person already has church membership, skip email verification
    const hasExistingMembership = person.memberships?.length > 0;
    const verificationCode = (dto.inviteToken || hasExistingMembership) ? null : this.generateVerificationCode();

    const user = this.userRepository.create({
      email: dto.email,
      password: hashedPassword,
      systemRole: SystemRole.USER,
      person: person,
      isEmailVerified: !!dto.inviteToken || hasExistingMembership,
      isOnboarded: !!dto.inviteToken || hasExistingMembership,
      provider: 'local',
      verificationCode,
      verificationCodeExpiresAt: verificationCode ? new Date(Date.now() + 15 * 60 * 1000) : null,
    });
    await this.userRepository.save(user);

    if (verificationCode) {
      this.emailService.sendVerificationCode(user.email, verificationCode);
    }

    return this.login({ email: dto.email, password: dto.password });
  }

  // ==========================================
  // LOGIN
  // ==========================================
  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      select: ['id', 'email', 'password', 'isOnboarded', 'systemRole', 'isEmailVerified', 'verificationCode', 'verificationCodeExpiresAt', 'provider'],
      relations: ['person'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // DEBUG log
    if (!user.isEmailVerified && user.verificationCode) {
      this.logger.log('\n=============================================');
      this.logger.log(`[LOGIN DEBUG] User: ${user.email} is NOT VERIFIED.`);
      this.logger.log(`[LOGIN DEBUG] Current Code: ${user.verificationCode}`);
      this.logger.log('=============================================\n');
    }

    let churchId = null;
    const authRoles: string[] = [];
    let membership: ChurchPerson | null = null;

    if (user.person) {
      // Find church membership
      if (dto.churchSlug) {
        const church = await this.churchRepository.findOne({
          where: { slug: dto.churchSlug },
        });
        if (!church) throw new BadRequestException('Church not found');

        membership = await this.memberRepository.findOne({
          where: { person: { id: user.person.id }, church: { id: church.id } },
        });

        if (!membership) {
          throw new UnauthorizedException('Not a member of this church');
        }

        churchId = church.id;
      } else {
        // Auto-find first membership
        membership = await this.memberRepository.findOne({
          where: { person: { id: user.person.id } },
          relations: ['church'],
          order: { joinedAt: 'DESC' },
        });
        if (membership) {
          churchId = membership.church?.id || membership.churchId;
        }
      }

      if (membership?.functionalRoles?.length > 0) {
        authRoles.push(...membership.functionalRoles);
      }
    }

    // JWT payload — minimal, NO onboarding state
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      personId: user.person?.id || null,
      systemRole: user.systemRole,
      isEmailVerified: user.isEmailVerified,
      provider: user.provider,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.person?.fullName || 'Usuario',
        personId: user.person?.id,
        memberId: membership?.id,
        ecclesiasticalRole: membership?.ecclesiasticalRole,
        membershipStatus: membership?.membershipStatus,
        isOnboarded: user.isOnboarded,
        isEmailVerified: user.isEmailVerified,
        systemRole: user.systemRole,
        roles: authRoles,
        provider: user.provider,
      },
      churchId,
    };
  }

  // ==========================================
  // SOCIAL LOGIN (Auth0 / Google)
  // ==========================================
  async validateSocialUser(dto: SocialLoginDto) {
    let user = await this.userRepository.findOne({
      where: { email: dto.email },
      relations: ['person'],
    });

    let potentialPersonMatch: Person | null = null;
    let isClaimProfileFlow = false;

    if (!user) {
      // AUTO-LINK: Check if Person exists with this email (offline person)
      const existingPerson = await this.personRepository.findOne({
        where: { email: dto.email },
        relations: ['user', 'memberships'],
      });

      if (existingPerson && !existingPerson.user) {
        // Person exists without user — check if has memberships (auto-link)
        if (existingPerson.memberships?.length > 0) {
          // Direct auto-link: create user linked to this person
          const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
          user = this.userRepository.create({
            email: dto.email,
            password: randomPassword,
            systemRole: SystemRole.USER,
            person: existingPerson,
            isEmailVerified: true,
            isOnboarded: true,
            provider: 'auth0',
          });
          user = await this.userRepository.save(user);
          user.person = existingPerson;
        } else {
          // Person exists but no memberships — claim profile flow
          potentialPersonMatch = existingPerson;
          isClaimProfileFlow = true;

          const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
          user = this.userRepository.create({
            email: dto.email,
            password: randomPassword,
            systemRole: SystemRole.USER,
            isEmailVerified: true,
            provider: 'auth0',
          });
          user = await this.userRepository.save(user);
        }
      } else {
        // Standard flow: create Person + User
        let person = this.personRepository.create({
          email: dto.email,
          fullName: dto.name || 'Usuario',
          avatarUrl: dto.picture,
        });
        person = await this.personRepository.save(person);

        const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
        user = this.userRepository.create({
          email: dto.email,
          password: randomPassword,
          systemRole: SystemRole.USER,
          person: person,
          isEmailVerified: true,
          provider: 'auth0',
        });
        user = await this.userRepository.save(user);
        user.person = person;
      }
    }

    if (isClaimProfileFlow) {
      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        personId: null,
        systemRole: user.systemRole,
        isEmailVerified: user.isEmailVerified,
        provider: user.provider,
      };

      return {
        accessToken: this.jwtService.sign(payload),
        user: {
          id: user.id,
          email: user.email,
        },
        claimProfile: {
          found: true,
          person: {
            id: potentialPersonMatch.id,
            fullName: potentialPersonMatch.fullName,
            email: potentialPersonMatch.email,
          },
        },
      };
    }

    // Standard flow — find membership
    if (!user.person) {
      user = await this.userRepository.findOne({
        where: { id: user.id },
        relations: ['person'],
      });
    }

    let churchId = null;
    const authRoles: string[] = [];
    let membership: ChurchPerson | null = null;

    if (user.person) {
      membership = await this.memberRepository.findOne({
        where: { person: { id: user.person.id } },
        relations: ['church'],
        order: { joinedAt: 'DESC' },
      });

      if (membership) {
        churchId = membership.church?.id || membership.churchId;
        if (membership.functionalRoles?.length > 0) {
          authRoles.push(...membership.functionalRoles);
        }
      }
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      personId: user.person?.id || null,
      systemRole: user.systemRole,
      isEmailVerified: user.isEmailVerified,
      provider: user.provider,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.person?.fullName,
        personId: user.person?.id,
        memberId: membership?.id,
        ecclesiasticalRole: membership?.ecclesiasticalRole,
        membershipStatus: membership?.membershipStatus,
        isEmailVerified: user.isEmailVerified,
        systemRole: user.systemRole,
        avatarUrl: user.person?.avatarUrl,
        roles: authRoles,
        provider: user.provider,
      },
      churchId,
    };
  }

  // ==========================================
  // SWITCH CHURCH
  // ==========================================
  async switchChurch(userId: string, targetChurchId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['person'],
    });

    if (!user) throw new UnauthorizedException('User not found');

    const membership = await this.memberRepository.findOne({
      where: {
        person: { id: user.person.id },
        church: { id: targetChurchId },
      },
      relations: ['church'],
    });

    if (!membership) {
      throw new UnauthorizedException('Not a member of the target church');
    }

    const authRoles: string[] = [];
    if (membership.functionalRoles?.length > 0) {
      authRoles.push(...membership.functionalRoles);
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      personId: user.person.id,
      systemRole: user.systemRole,
      isEmailVerified: user.isEmailVerified,
      provider: user.provider,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.person.fullName,
        personId: user.person.id,
        memberId: membership.id,
        ecclesiasticalRole: membership.ecclesiasticalRole,
        membershipStatus: membership.membershipStatus,
        isOnboarded: user.isOnboarded,
        isEmailVerified: user.isEmailVerified,
        systemRole: user.systemRole,
        avatarUrl: user.person.avatarUrl,
        roles: authRoles,
        provider: user.provider,
      },
      churchId: targetChurchId,
      churchName: membership.church.name,
      churchSlug: membership.church.slug,
    };
  }

  // ==========================================
  // CLAIM PROFILE
  // ==========================================
  async claimProfile(
    userId: string,
    personIdToClaim: string | null,
    createNew: boolean,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['person'],
    });
    if (!user) throw new UnauthorizedException('User not found');
    if (user.person) throw new BadRequestException('User is already linked to a person');

    if (createNew) {
      const person = this.personRepository.create({
        email: user.email,
        fullName: 'Usuario',
      });
      const savedPerson = await this.personRepository.save(person);
      user.person = savedPerson;
      await this.userRepository.save(user);
      return this.generateTokenForUser(user);
    } else {
      if (!personIdToClaim) throw new BadRequestException('Person ID required');

      const person = await this.personRepository.findOne({
        where: { id: personIdToClaim },
        relations: ['user'],
      });
      if (!person) throw new NotFoundException('Person not found');
      if (person.user) throw new BadRequestException('Person already claimed');

      user.person = person;
      await this.userRepository.save(user);
      return this.generateTokenForUser(user);
    }
  }

  // ==========================================
  // VERIFY EMAIL — now returns new token!
  // ==========================================
  async verifyEmail(email: string, code: string) {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['person'],
    });
    if (!user) throw new NotFoundException('User not found');

    if (user.isEmailVerified) {
      return { message: 'Email is already verified' };
    }

    if (user.verificationCode !== code) {
      throw new BadRequestException('Código de verificación incorrecto');
    }

    if (!user.verificationCodeExpiresAt || new Date() > user.verificationCodeExpiresAt) {
      throw new BadRequestException('El código de verificación ha expirado');
    }

    user.isEmailVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpiresAt = null;

    await this.userRepository.save(user);

    // Generate new token with updated isEmailVerified
    const tokenResult = await this.generateTokenForUser(user);

    return {
      message: 'Email verificado con éxito',
      ...tokenResult,
    };
  }

  async resendVerificationCode(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) throw new NotFoundException('User not found');

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const newCode = this.generateVerificationCode();
    user.verificationCode = newCode;
    user.verificationCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.userRepository.save(user);
    this.emailService.sendVerificationCode(user.email, newCode);

    return { message: 'Nuevo código enviado' };
  }

  // ==========================================
  // HELPERS
  // ==========================================
  async generateTokenForUser(user: User) {
    const reloadedUser = await this.userRepository.findOne({
      where: { id: user.id },
      relations: ['person'],
    });

    const payload: JwtPayload = {
      sub: reloadedUser.id,
      email: reloadedUser.email,
      personId: reloadedUser.person?.id || null,
      systemRole: reloadedUser.systemRole,
      isEmailVerified: reloadedUser.isEmailVerified,
      provider: reloadedUser.provider,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: reloadedUser.id,
        email: reloadedUser.email,
        fullName: reloadedUser.person?.fullName,
        personId: reloadedUser.person?.id,
        isOnboarded: reloadedUser.isOnboarded,
        isEmailVerified: reloadedUser.isEmailVerified,
        systemRole: reloadedUser.systemRole,
        provider: reloadedUser.provider,
      },
    };
  }

  private generateSlug(name: string): string {
    return (
      name
        .toLowerCase()
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, '') +
      '-' +
      Math.floor(Math.random() * 1000)
    );
  }

  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
