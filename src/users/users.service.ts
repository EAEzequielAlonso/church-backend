import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Person } from './entities/person.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Person) private personRepository: Repository<Person>,
  ) {}

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

    // Update Person fields
    if (user.person) {
      Object.assign(user.person, {
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        birthDate: data.birthDate,
        avatarUrl: data.avatarUrl,
        sex: data.sex,
        maritalStatus: data.maritalStatus,
        documentNumber: data.documentNumber,
        nationality: data.nationality,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country,
        emergencyContactName: data.emergencyContactName,
        emergencyContactPhone: data.emergencyContactPhone,
        occupation: data.occupation,
      });
      await this.personRepository.save(user.person);
    }

    return this.userRepository.save(user);
  }
}
