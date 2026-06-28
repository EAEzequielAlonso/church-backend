import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Church } from './entities/church.entity';
import { User } from '../users/entities/user.entity';
import { Person } from '../users/entities/person.entity';
import { CreateChurchDto } from './dto/create-church.dto';

@Injectable()
export class ChurchesService {
  private readonly logger = new Logger(ChurchesService.name);

  constructor(
    @InjectRepository(Church) private churchRepository: Repository<Church>,

    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Person) private personRepository: Repository<Person>,
  ) { }

  async create(userId: string, dto: CreateChurchDto) {
    const slug = dto.slug || this.generateSlug(dto.name);
    // Check slug on public profiles (conceptually where slug lives now)
    // For simplicity, we assume uniqueness is enforced there.

    // 1. Create canonical Church
    const church = this.churchRepository.create({
      canonicalName: dto.name,


    });
    const savedChurch = await this.churchRepository.save(church);

    // Fase 0: No crear workspace ERP automáticamente.
    // Church + ChurchPublicProfile es suficiente para la Network.

    // 3. Find User & Person
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['person'],
    });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    let person = user.person;
    if (!person) {
      this.logger.warn(`Person relation missing for user ${user.id}; repairing link.`);
      const existingPerson = await this.personRepository.findOne({
        where: { email: user.email },
      });
      if (existingPerson) {
        person = existingPerson;
        user.person = person;
        await this.userRepository.save(user);
      } else {
        person = this.personRepository.create({
          email: user.email,
          firstName: user.email.split('@')[0],
          lastName: '',
        });
        person = await this.personRepository.save(person);
        user.person = person;
        await this.userRepository.save(user);
      }
    }

    user.isOnboarded = true;
    await this.userRepository.save(user);

    return savedChurch;
  }

  async findOne(id: string) {
    const church = await this.churchRepository.findOne({ where: { id } });
    if (!church) throw new BadRequestException('Church not found');
    return church;
  }

  async update(id: string, data: any) {
    const church = await this.findOne(id);
    if (data.name !== undefined) church.canonicalName = data.name;

    const savedChurch = await this.churchRepository.save(church);

    // Workspace sync disabled (Fase 0)

    return savedChurch;
  }

  async search(query: string) {
    if (!query) return [];

    const normalizedQuery = query
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

    return this.churchRepository
      .createQueryBuilder('church')
      .where(
        `REGEXP_REPLACE(LOWER(unaccent(church.canonicalName)), '[^a-z0-9]', '', 'g') LIKE :query`,
        { query: `%${normalizedQuery}%` },
      )
      .take(10)
      .getMany();
  }

  async getActive(id: string) {
    const church = await this.findOne(id);
    return church;
  }

  async updateActive(id: string, dto: any) {
    const church = await this.findOne(id);

    if (dto.name !== undefined) church.canonicalName = dto.name;

    const savedChurch = await this.churchRepository.save(church);

    // Workspace sync disabled (Fase 0)

    return savedChurch;
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
