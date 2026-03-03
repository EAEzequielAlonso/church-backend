import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { Person } from '../users/entities/person.entity';
import { Church } from '../churches/entities/church.entity';
import { ChurchPerson } from '../members/entities/church-person.entity';
import {
  RegisterChurchDto,
  JoinChurchDto,
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

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Person) private personRepository: Repository<Person>,
    @InjectRepository(Church) private churchRepository: Repository<Church>,
    @InjectRepository(ChurchPerson)
    private memberRepository: Repository<ChurchPerson>,
    private jwtService: JwtService,
  ) {}

  async registerChurch(dto: RegisterChurchDto) {
    // 1. Check if email exists
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // 2. Check if church slug exists (if provided)
    if (dto.churchSlug) {
      const existingSlug = await this.churchRepository.findOne({
        where: { slug: dto.churchSlug },
      });
      if (existingSlug) {
        throw new BadRequestException('Church slug is taken');
      }
    }

    // 3. Create Church
    const church = this.churchRepository.create({
      name: dto.churchName,
      slug: dto.churchSlug || this.generateSlug(dto.churchName),
      plan: PlanType.TRIAL,
      subscriptionStatus: SubscriptionStatus.TRIAL,
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
    });
    const savedChurch = await this.churchRepository.save(church);

    // 4. Create Person
    const person = this.personRepository.create({
      email: dto.email,
      fullName: dto.fullName,
    });
    const savedPerson = await this.personRepository.save(person);

    // 5. Create User
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      email: dto.email,
      password: hashedPassword,
      systemRole: SystemRole.USER,
      person: savedPerson,
    });
    await this.userRepository.save(user);

    // 6. Create ChurchPerson (Admin)
    const member = this.memberRepository.create({
      person: savedPerson,
      church: savedChurch,
      ecclesiasticalRole: EcclesiasticalRole.PASTOR, // Default for creator
      functionalRoles: [
        FunctionalRole.ADMIN_CHURCH,
        FunctionalRole.AUDITOR,
        FunctionalRole.COUNSELOR,
        FunctionalRole.MINISTRY_LEADER,
      ], // Full access
      membershipStatus: MembershipStatus.MEMBER,
    });
    await this.memberRepository.save(member);

    // 7. Generate Token
    return this.login({
      email: dto.email,
      password: dto.password,
      churchSlug: savedChurch.slug,
    });
  }

  async registerUser(dto: RegisterUserDto) {
    // 1. Check if email exists
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    let person = await this.personRepository.findOne({
      where: { email: dto.email },
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

    // 3. Create User
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      email: dto.email,
      password: hashedPassword,
      systemRole: SystemRole.USER,
      person: person,
    });
    await this.userRepository.save(user);

    // 4. Generate Token (No specific church context yet)
    return this.login({ email: dto.email, password: dto.password });
  }

  async joinChurch(dto: JoinChurchDto) {
    // 1. Find Church
    const church = await this.churchRepository.findOne({
      where: { slug: dto.churchSlug },
    });
    if (!church) throw new BadRequestException('Church not found');

    // 2. Find User or Create Person/User
    let user = await this.userRepository.findOne({
      where: { email: dto.email },
      relations: ['person'],
    });
    let person: Person;

    if (!user) {
      if (!dto.password)
        throw new BadRequestException('Password required for new user');

      // Create Person
      person = this.personRepository.create({
        email: dto.email,
        fullName: dto.fullName || 'New Member',
      });
      person = await this.personRepository.save(person);

      // Create User
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      user = this.userRepository.create({
        email: dto.email,
        password: hashedPassword,
        systemRole: SystemRole.USER,
        person: person,
      });
      await this.userRepository.save(user);
    } else {
      person = user.person;
    }

    // 3. Check existing membership
    const existingMember = await this.memberRepository.findOne({
      where: { person: { id: person.id }, church: { id: church.id } },
    });

    if (existingMember) {
      throw new BadRequestException('Already a member or pending approval');
    }

    // 4. Create Pending Membership
    const member = this.memberRepository.create({
      person: person,
      church,
      ecclesiasticalRole: EcclesiasticalRole.NONE,
      membershipStatus: MembershipStatus.MEMBER,
    });
    await this.memberRepository.save(member);

    return { message: 'Request sent. Waiting for approval.' };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      select: ['id', 'email', 'password', 'isOnboarded', 'systemRole'],
      relations: ['person'], // Load Person to get ID
    });

    if (!user) {
      // Removed bcrypt check for safety if user not found, but logic was:
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    let churchId = null;
    const authRoles: string[] = []; // Strings for JWT
    let membership: ChurchPerson | null = null;

    // If churchSlug provided, validate membership
    if (dto.churchSlug) {
      const church = await this.churchRepository.findOne({
        where: { slug: dto.churchSlug },
      });
      if (!church) throw new BadRequestException('Church not found');

      membership = await this.memberRepository.findOne({
        where: { person: { id: user.person.id }, church: { id: church.id } },
      });

      // Allow if status is MEMBER, or maybe PROSPECT can login but with limited access?
      // For now, let's allow login but role check will limit access.
      if (!membership) {
        throw new UnauthorizedException(
          'Not a member of this church or pending approval',
        );
      }

      churchId = church.id;
      // Push the single role to array
      // Push the single role to array
      // Push functional roles to roles array (for PermissionsGuard)
      if (membership.functionalRoles && membership.functionalRoles.length > 0) {
        authRoles.push(...membership.functionalRoles);
      }
    } else {
      // Try to find a default church (first active membership)
      membership = await this.memberRepository.findOne({
        where: { person: { id: user.person.id } },
        relations: ['church'],
        order: { joinedAt: 'DESC' },
      });
      if (membership) {
        churchId = membership.church.id;
        if (
          membership.functionalRoles &&
          membership.functionalRoles.length > 0
        ) {
          authRoles.push(...membership.functionalRoles);
        }
      }
    }

    // Add System Role if needed in JWT
    // if (user.systemRole === SystemRole.ADMIN_APP) authRoles.push('SUPER_ADMIN');

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      personId: user.person.id,
      churchId,
      memberId: membership?.id,
      roles: authRoles,
      ecclesiasticalRole: membership?.ecclesiasticalRole,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.person?.fullName || 'Usuario', // Get from Person
        personId: user.person.id,
        memberId: membership?.id,
        ecclesiasticalRole: membership?.ecclesiasticalRole,
        isOnboarded: user.isOnboarded,
        roles: authRoles,
      },
      churchId, // Return to client so they know which context is active
    };
  }

  async validateSocialUser(dto: SocialLoginDto) {
    let user = await this.userRepository.findOne({
      where: { email: dto.email },
      relations: ['person'],
    });

    // Flag to indicate if we are in "Claim Profile" state
    let potentialPersonMatch: Person | null = null;
    let isClaimProfileFlow = false;

    if (!user) {
      // Check if there is an existing PERSON with this email (OFFLINE PERSON)
      // We need to check if this person is already linked to a user.
      const existingPerson = await this.personRepository.findOne({
        where: { email: dto.email },
        relations: ['user'], // Check if already has user
      });

      if (existingPerson && !existingPerson.user) {
        // MATCH FOUND!
        potentialPersonMatch = existingPerson;
        isClaimProfileFlow = true;

        const randomPassword = await bcrypt.hash(
          Math.random().toString(36),
          10,
        );
        user = this.userRepository.create({
          email: dto.email,
          password: randomPassword,
          systemRole: SystemRole.USER,
          // person: null // Explicitly null
        });
        user = await this.userRepository.save(user);
      } else {
        // Standard Flow: Create Person + User linked
        let person = this.personRepository.create({
          email: dto.email,
          fullName: dto.name || 'Usuario',
          avatarUrl: dto.picture,
        });
        person = await this.personRepository.save(person);

        const randomPassword = await bcrypt.hash(
          Math.random().toString(36),
          10,
        );
        user = this.userRepository.create({
          email: dto.email,
          password: randomPassword,
          systemRole: SystemRole.USER,
          person: person, // Link relationship
        });
        user = await this.userRepository.save(user);

        // Reload user with person relation to be safe
        user.person = person;
      }
    }

    if (isClaimProfileFlow) {
      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        personId: null, // No person yet
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

    // Standard flow continue...
    if (!user.person) {
      user = await this.userRepository.findOne({
        where: { id: user.id },
        relations: ['person'],
      });
    }

    // Try to find a default church (first active membership linked to PERSON)
    const membership = await this.memberRepository.findOne({
      where: { person: { id: user.person.id } },
      relations: ['church'],
      order: { joinedAt: 'DESC' },
    });

    let churchId = null;
    const authRoles: string[] = [];

    if (membership) {
      churchId = membership.church.id;
      if (membership.functionalRoles && membership.functionalRoles.length > 0) {
        authRoles.push(...membership.functionalRoles);
      }
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      personId: user.person.id,
      churchId,
      memberId: membership?.id,
      roles: authRoles,
      ecclesiasticalRole: membership?.ecclesiasticalRole,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.person.fullName,
        personId: user.person.id,
        memberId: membership?.id,
        ecclesiasticalRole: membership?.ecclesiasticalRole,
        isOnboarded: user.isOnboarded,
        avatarUrl: user.person.avatarUrl,
        roles: authRoles,
      },
      churchId,
    };
  }

  async switchChurch(userId: string, targetChurchId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['person'],
    });

    if (!user) throw new UnauthorizedException('User not found');

    // Check if user is a member of the target church
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
    if (membership.functionalRoles && membership.functionalRoles.length > 0) {
      authRoles.push(...membership.functionalRoles);
    }

    // Generate new token with updated church context
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      personId: user.person.id,
      churchId: targetChurchId,
      memberId: membership.id,
      roles: authRoles,
      ecclesiasticalRole: membership.ecclesiasticalRole,
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
        isOnboarded: user.isOnboarded,
        avatarUrl: user.person.avatarUrl,
        roles: authRoles,
      },
      churchId: targetChurchId,
      churchName: membership.church.name,
      churchSlug: membership.church.slug,
    };
  }

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
    if (user.person)
      throw new BadRequestException('User is already linked to a person');

    if (createNew) {
      // User rejected the claim, create NEW person
      const person = this.personRepository.create({
        email: user.email,
        fullName: 'Usuario', // Or prompt for name? For now default.
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

  private async generateTokenForUser(user: User) {
    // Helper to re-generate full token after claim
    // Reload person
    const reloadedUser = await this.userRepository.findOne({
      where: { id: user.id },
      relations: ['person'],
    });

    // Find default church
    const membership = await this.memberRepository.findOne({
      where: { person: { id: reloadedUser.person.id } },
      relations: ['church'],
      order: { joinedAt: 'DESC' },
    });

    let churchId = null;
    const authRoles: string[] = [];
    if (membership) {
      churchId = membership.church.id;
      if (membership.functionalRoles && membership.functionalRoles.length > 0) {
        authRoles.push(...membership.functionalRoles);
      }
    }

    const payload: JwtPayload = {
      sub: reloadedUser.id,
      email: reloadedUser.email,
      personId: reloadedUser.person.id,
      churchId,
      memberId: membership?.id,
      roles: authRoles,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: reloadedUser.id,
        email: reloadedUser.email,
        fullName: reloadedUser.person.fullName,
        personId: reloadedUser.person.id,
        isOnboarded: reloadedUser.isOnboarded,
        roles: authRoles,
      },
      churchId,
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
}
