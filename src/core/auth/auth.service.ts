import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../users/entities/user.entity';
import { Person } from '../users/entities/person.entity';
import { Church } from '../churches/entities/church.entity';
import {
  RegisterChurchDto,
  LoginDto,
  RegisterUserDto,
} from './dto/dto';

import { SocialLoginDto } from './dto/social-login.dto';
import {
  SystemRole,
} from '../../common/enums';
import { JwtPayload } from './interfaces';
import { EmailService } from './email.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Person) private personRepository: Repository<Person>,
    @InjectRepository(Church) private churchRepository: Repository<Church>,
    private jwtService: JwtService,
    private emailService: EmailService,
    private dataSource: DataSource,
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
        where: { publicProfile: { slug: dto.churchSlug } },
      });
      if (existingSlug) {
        throw new BadRequestException('Church slug is taken');
      }
    }

    // Create Church canonical identity
    const church = this.churchRepository.create({
      canonicalName: dto.churchName,
      publicProfile: { slug: dto.churchSlug || this.generateSlug(dto.churchName) },
    });

    // Create Person
    const person = this.personRepository.create({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const verificationCode = this.generateVerificationCode();

    const user = this.userRepository.create({
      email: dto.email,
      password: hashedPassword,
      systemRole: SystemRole.USER,
      verificationCode,
      verificationCodeExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    await this.dataSource.transaction(async (manager) => {
      await manager.save(church);
      const savedPerson = await manager.save(person);
      user.person = savedPerson;
      await manager.save(user);
    });

    this.emailService.sendVerificationCode(user.email, verificationCode);

    return { message: 'Verification email sent', email: dto.email };
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
    // AUTO-LINK: Check if Person exists by email (offline person)
    person = await this.personRepository.findOne({
      where: { email: dto.email },
      relations: ['user'],
    });

    if (person && person.user) {
      throw new BadRequestException('User with this email already exists');
    }

    let personToSave: Person = null;

    if (!person) {
      personToSave = this.personRepository.create({
        email: dto.email,
        firstName: dto.firstName || 'Usuario',
        lastName: dto.lastName || '',
      });
    }

    // Create User
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const verificationCode = dto.inviteToken ? null : this.generateVerificationCode();

    const user = this.userRepository.create({
      email: dto.email,
      password: hashedPassword,
      systemRole: SystemRole.USER,
      isEmailVerified: !!dto.inviteToken,
      isOnboarded: !!dto.inviteToken,
      provider: 'local',
      verificationCode,
      verificationCodeExpiresAt: verificationCode ? new Date(Date.now() + 15 * 60 * 1000) : null,
    });

    await this.dataSource.transaction(async (manager) => {
      if (personToSave) {
        personToSave = await manager.save(personToSave);
        user.person = personToSave;
      } else {
        user.person = person;
      }
      await manager.save(user);
    });

    if (verificationCode) {
      this.emailService.sendVerificationCode(user.email, verificationCode);
    }

    return { message: 'Verification email sent', email: dto.email };
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

    if (user.person) {
      // AUTO-HEAL: Sync email to Person if missing (fix for old manual registrations)
      if (!user.person.email && user.email) {
        user.person.email = user.email;
        await this.personRepository.save(user.person);
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
        fullName: `${user.person?.firstName || ''} ${user.person?.lastName || ''}`.trim() || 'Usuario',
        personId: user.person?.id,
        isOnboarded: user.isOnboarded,
        isEmailVerified: user.isEmailVerified,
        systemRole: user.systemRole,
        provider: user.provider,
      },
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

    if (!user) {
      throw new UnauthorizedException('Usuario no registrado. Por favor, regístrese primero.');
    }

    // Sync avatar if missing on existing user
    if (user && user.person && !user.person.avatarUrl && dto.picture) {
      user.person.avatarUrl = dto.picture;
      await this.personRepository.save(user.person);
    }

    // Standard flow
    if (!user.person) {
      user = await this.userRepository.findOne({
        where: { id: user.id },
        relations: ['person'],
      });
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
        fullName: `${user.person?.firstName || ''} ${user.person?.lastName || ''}`.trim() || 'S/N',
        personId: user.person?.id,
        isEmailVerified: user.isEmailVerified,
        systemRole: user.systemRole,
        avatarUrl: user.person?.avatarUrl,
        provider: user.provider,
      },
    };
  }



  // ==========================================
  // CLAIM PROFILE
  // ==========================================
  async claimProfile(
    userId: string,
    personIdToClaim: string | null,
    createNew: boolean,
    avatarUrl?: string,
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
        firstName: 'Usuario',
        lastName: '',
      });
      const savedPerson = await this.personRepository.save(person);

      if (!savedPerson.avatarUrl && avatarUrl) {
        savedPerson.avatarUrl = avatarUrl;
        await this.personRepository.save(savedPerson);
      }

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

      if (!person.avatarUrl && avatarUrl) {
        person.avatarUrl = avatarUrl;
        await this.personRepository.save(person);
      }

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
  // FORGOT PASSWORD
  // ==========================================
  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    
    // Si no existe el usuario, o es un usuario social sin contraseña,
    // retornamos éxito genérico para evitar enumeración.
    if (!user || user.provider !== 'local') {
      return { message: 'Si el correo electrónico está registrado, recibirás instrucciones para restablecer tu contraseña.' };
    }

    // Generar token criptográficamente seguro
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    user.resetPasswordToken = token;
    user.resetPasswordExpiresAt = expiresAt;

    await this.userRepository.save(user);
    await this.emailService.sendPasswordResetEmail(user.email, token);

    return { message: 'Si el correo electrónico está registrado, recibirás instrucciones para restablecer tu contraseña.' };
  }

  async validateResetToken(token: string) {
    const user = await this.userRepository.findOne({ where: { resetPasswordToken: token } });

    if (!user || !user.resetPasswordExpiresAt || new Date() > user.resetPasswordExpiresAt) {
      throw new BadRequestException('El enlace de recuperación es inválido o ha expirado.');
    }

    return { valid: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.userRepository.findOne({
      where: { resetPasswordToken: token },
      select: ['id', 'email', 'resetPasswordToken', 'resetPasswordExpiresAt'],
    });

    if (!user || !user.resetPasswordExpiresAt || new Date() > user.resetPasswordExpiresAt) {
      throw new BadRequestException('El enlace de recuperación es inválido o ha expirado.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpiresAt = null;

    // Si el usuario cambia su contraseña, asumimos que su email es válido (side-effect: auto-verify).
    // user.isEmailVerified = true; (opcional, dejamos solo reset token por seguridad para no alterar su estado actual a menos que sea deseado. Por ahora mantenemos la modificación mínima).

    await this.userRepository.save(user);

    return { message: 'Contraseña actualizada correctamente.' };
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
        fullName: `${reloadedUser.person?.firstName || ''} ${reloadedUser.person?.lastName || ''}`.trim() || 'S/N',
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
