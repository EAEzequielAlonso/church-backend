import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Person } from '../users/entities/person.entity';
import { ChurchPerson } from '../members/entities/church-person.entity';
import { Church } from '../churches/entities/church.entity';
import * as bcrypt from 'bcrypt';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Person) private personRepository: Repository<Person>,
    @InjectRepository(ChurchPerson) private churchPersonRepository: Repository<ChurchPerson>,
    @InjectRepository(Church) private churchRepository: Repository<Church>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['person'],
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');

    const membership = await this.churchPersonRepository.findOne({
      where: { person: { id: user.personId } },
      relations: ['church'],
      order: { joinedAt: 'DESC' },
    });

    const church = membership?.church || null;

    return {
      user: {
        id: user.id,
        email: user.email,
        isOnboarded: user.isOnboarded,
        systemRole: user.systemRole,
      },
      person: user.person,
      church: church || null,
      membership: membership || null,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['person'],
    });

    if (!user || !user.person) {
      throw new NotFoundException('Perfil de persona no encontrado para este usuario');
    }

    // Update Person fields explicitly as requested
    const person = user.person;
    const editableFields = [
      'firstName', 'lastName', 'phoneNumber', 'documentId', 'birthDate', 
      'maritalStatus', 'addressLine1', 'addressLine2', 
      'city', 'state', 'postalCode', 'avatarUrl'
    ];

    editableFields.forEach(field => {
      if (dto[field] !== undefined) {
        person[field] = dto[field];
      }
    });

    // fullName removed

    await this.personRepository.save(person);
    return this.getProfile(userId); 
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'password'],
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.save(user);

    return { message: 'Contraseña actualizada exitosamente' };
  }
}
