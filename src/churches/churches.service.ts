import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Church } from './entities/church.entity';
import { ChurchPerson } from '../members/entities/church-person.entity';
import { User } from '../users/entities/user.entity';
import { Person } from '../users/entities/person.entity';
import { CreateChurchDto } from './dto/create-church.dto';
import {
  PlanType,
  SubscriptionStatus,
  EcclesiasticalRole,
  FunctionalRole,
} from '../common/enums';
import { MembershipStatus } from '../members/enums/membership-status.enum';

@Injectable()
export class ChurchesService {
  constructor(
    @InjectRepository(Church) private churchRepository: Repository<Church>,
    @InjectRepository(ChurchPerson)
    private memberRepository: Repository<ChurchPerson>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Person) private personRepository: Repository<Person>,
  ) {}

  async create(userId: string, dto: CreateChurchDto) {
    console.log('ChurchesService.create called');
    // 1. Check slug uniqueness
    const slug = dto.slug || this.generateSlug(dto.name);
    console.log('Checking slug:', slug);
    const existing = await this.churchRepository.findOne({ where: { slug } });
    if (existing) {
      console.log('Slug taken:', slug);
      throw new BadRequestException('Church identifier (slug) is taken');
    }

    // 2. Create Church
    console.log('Creating church entity...');
    const church = this.churchRepository.create({
      name: dto.name,
      slug,
      address: dto.address,
      city: dto.city,
      country: dto.country,
      plan: PlanType.TRIAL,
      subscriptionStatus: SubscriptionStatus.TRIAL,
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    });
    const savedChurch = await this.churchRepository.save(church);
    console.log('Church saved:', savedChurch.id);

    // 3. Find User & Person
    console.log('Finding user:', userId);
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['person'],
    });
    if (!user) {
      console.log('User not found');
      throw new BadRequestException('User not found');
    }

    let person = user.person;
    // Robustness: If person missing (should not happen in normal flow but keeps occurring in dev/sync issues), create it.
    if (!person) {
      console.log('Person missing, attempting creation or link...');
      // Check if person exists by email to avoid duplication if relation was somehow broken or not linked
      const existingPerson = await this.personRepository.findOne({
        where: { email: user.email },
      });
      if (existingPerson) {
        console.log('Person found by email, linking...');
        person = existingPerson;
        user.person = person;
        await this.userRepository.save(user);
      } else {
        console.log('Creating new person...');
        person = this.personRepository.create({
          email: user.email,
          fullName: user.email.split('@')[0], // Fallback name
        });
        person = await this.personRepository.save(person);
        user.person = person;
        await this.userRepository.save(user);
      }
    }
    console.log('Person ready:', person.id);

    // 4. Create Admin Membership
    console.log('Creating membership...');

    const member = this.memberRepository.create({
      person: user.person,
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
    console.log('Membership saved');

    // 5. Update User Onboarding Status
    user.isOnboarded = true;
    await this.userRepository.save(user);
    console.log('User onboarding updated');

    return savedChurch;
  }

  async findOne(id: string) {
    const church = await this.churchRepository.findOne({ where: { id } });
    if (!church) throw new BadRequestException('Church not found');
    return church;
  }

  async update(id: string, data: any) {
    const church = await this.findOne(id);
    // Prevent update of sensitive fields if any, or just merge
    Object.assign(church, data);
    return this.churchRepository.save(church);
  }

  async search(query: string) {
    if (!query) return [];
    return this.churchRepository
      .createQueryBuilder('church')
      .where(
        'LOWER(church.name) LIKE :query OR LOWER(church.address) LIKE :query OR LOWER(church.city) LIKE :query OR LOWER(church.slug) LIKE :query',
        { query: `%${query.toLowerCase()}%` },
      )
      .take(10)
      .getMany();
  }

  async getActive(id: string) {
    const church = await this.findOne(id);
    return church; // The entity has all necessary fields
  }

  async updateActive(id: string, dto: any) {
    const church = await this.findOne(id);
    
    // Explicitly update only allowed fields
    if (dto.name !== undefined) church.name = dto.name;
    if (dto.logoUrl !== undefined) church.logoUrl = dto.logoUrl;
    if (dto.coverUrl !== undefined) church.coverUrl = dto.coverUrl;
    if (dto.address !== undefined) church.address = dto.address;
    if (dto.city !== undefined) church.city = dto.city;
    if (dto.state !== undefined) church.state = dto.state;
    if (dto.country !== undefined) church.country = dto.country;
    if (dto.website !== undefined) church.website = dto.website;
    if (dto.instagram !== undefined) church.instagram = dto.instagram;
    if (dto.facebook !== undefined) church.facebook = dto.facebook;

    return this.churchRepository.save(church);
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
