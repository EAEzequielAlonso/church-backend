import {
  Injectable,
  NotFoundException,
  ConflictException,
  OnApplicationBootstrap,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { User } from './entities/user.entity';
import { Person } from './entities/person.entity';
import * as bcrypt from 'bcrypt';
import { SystemRole } from '../../common/enums';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { UserWorkspaceDto } from './dto/user-workspace.dto';
import { ChurchPublicProfile } from 'src/public/church/entities/church_public_profile.entity';

@Injectable()
export class UsersService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Person) private personRepository: Repository<Person>,
    @InjectRepository(ChurchPublicProfile)
    private churchProfileRepository: Repository<ChurchPublicProfile>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getWorkspaces(personId: string): Promise<UserWorkspaceDto[]> {
    if (!personId) return [];

    const profiles = await this.churchProfileRepository.find({
      where: {
        isCurrentAdmin: true,
        church: { relations: { personId, isCurrentAdmin: true } },
      },
      relations: ['church'],
    });

    return profiles.map((profile) => ({
      churchId: profile.churchId,
      churchSlug: profile.slug,
      churchName: profile.church?.canonicalName || 'Iglesia Desconocida',
      isAdmin: true,
    }));
  }

  async onApplicationBootstrap() {
    this.logger.log('Checking for default admin app user...');
    const adminEmail = 'phyessoft@gmail.com';
    const existingAdmin = await this.userRepository.findOne({
      where: { email: adminEmail },
      relations: ['person'],
    });

    if (!existingAdmin) {
      this.logger.log('Creating default admin app user Ezequiel Alonso...');

      const person = this.personRepository.create({
        email: adminEmail,
        firstName: 'Ezequiel',
        lastName: 'Alonso',
      });
      const savedPerson = await this.personRepository.save(person);

      const hashedPassword = await bcrypt.hash('Calefito.3336', 10);
      const user = this.userRepository.create({
        email: adminEmail,
        password: hashedPassword,
        systemRole: SystemRole.ADMIN_APP,
        person: savedPerson,
        isOnboarded: true,
        isEmailVerified: true,
        provider: 'local',
      });
      await this.userRepository.save(user);
      this.logger.log('Default admin app user created successfully.');
    } else {
      let needsUpdate = false;

      // Garantizar el rol estructural que gatilla los permisos dinámicos
      if (existingAdmin.systemRole !== SystemRole.ADMIN_APP) {
        existingAdmin.systemRole = SystemRole.ADMIN_APP;
        needsUpdate = true;
      }

      // Garantizar que tenga Person asociado
      if (!existingAdmin.person) {
        const person = this.personRepository.create({
          email: adminEmail,
          firstName: 'Ezequiel',
          lastName: 'Alonso',
        });
        existingAdmin.person = await this.personRepository.save(person);
        needsUpdate = true;
      } else {
        // Asegurar integridad de nombre/apellido si estuviere vacío
        if (!existingAdmin.person.firstName || !existingAdmin.person.lastName) {
          existingAdmin.person.firstName =
            existingAdmin.person.firstName || 'Ezequiel';
          existingAdmin.person.lastName =
            existingAdmin.person.lastName || 'Alonso';
          await this.personRepository.save(existingAdmin.person);
        }
      }

      if (needsUpdate) {
        await this.userRepository.save(existingAdmin);
        this.logger.log(
          'Default admin app user updated to enforce ADMIN_APP privileges.',
        );
      } else {
        this.logger.log(
          'Default admin app user already verified and has correct privileges.',
        );
      }
    }
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['person'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, data: any) {
    const user = await this.findOne(userId);

    // Update User fields
    if (data.password) user.password = await bcrypt.hash(data.password, 10);
    if (data.isOnboarded !== undefined) user.isOnboarded = data.isOnboarded;

    // Update Person fields
    if (user.person) {
      if (data.slug && data.slug !== user.person.slug) {
        const existing = await this.personRepository.findOne({
          where: { slug: data.slug, id: Not(user.person.id) },
        });
        if (existing) {
          throw new ConflictException('Slug is already taken');
        }
      }

      if (data.firstName !== undefined) user.person.firstName = data.firstName;
      if (data.lastName !== undefined) user.person.lastName = data.lastName;
      if (data.phoneNumber !== undefined)
        user.person.phoneNumber = data.phoneNumber;
      if (data.birthDate !== undefined) user.person.birthDate = data.birthDate;
      if (data.avatarUrl !== undefined) user.person.avatarUrl = data.avatarUrl;
      if (data.sex !== undefined) user.person.sex = data.sex;
      if (data.maritalStatus !== undefined)
        user.person.maritalStatus = data.maritalStatus;
      if (data.nationality !== undefined)
        user.person.nationality = data.nationality;
      if (data.address !== undefined) user.person.address = data.address;
      const oldCountry = user.person.country;
      const oldState = user.person.state;
      const oldCity = user.person.city;

      if (data.city !== undefined) user.person.city = data.city;
      if (data.state !== undefined) user.person.state = data.state;
      if (data.postalCode !== undefined)
        user.person.postalCode = data.postalCode;
      if (data.country !== undefined) user.person.country = data.country;
      if (data.latitude !== undefined) user.person.latitude = data.latitude;
      if (data.longitude !== undefined) user.person.longitude = data.longitude;
      if (data.occupation !== undefined)
        user.person.occupation = data.occupation;

      if (data.slug !== undefined) user.person.slug = data.slug;
      if (data.isPublicProfileEnabled !== undefined)
        user.person.isPublicProfileEnabled = data.isPublicProfileEnabled;

      await this.personRepository.save(user.person);

      const addressChanged =
        oldCountry !== user.person.country ||
        oldState !== user.person.state ||
        oldCity !== user.person.city;

      if (
        addressChanged &&
        user.person.country &&
        user.person.state &&
        user.person.city
      ) {
        this.eventEmitter.emit('user.profile.address.updated', {
          personId: user.person.id,
          country: user.person.country,
          state: user.person.state,
          city: user.person.city,
        });
      }
    }

    return this.userRepository.save(user);
  }
}
