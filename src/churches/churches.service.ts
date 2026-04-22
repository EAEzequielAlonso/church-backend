import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Church } from './entities/church.entity';
import { ChurchPerson } from '../members/entities/church-person.entity';
import { User } from '../users/entities/user.entity';
import { Person } from '../users/entities/person.entity';
import { Currency } from '../treasury/enums/treasury.enums';
import { EcclesiasticalRole, FunctionalRole, PlanType, SubscriptionStatus } from 'src/common/enums';
import { MembershipStatus } from 'src/members/enums/membership-status.enum';
import { CreateChurchDto } from './dto/create-church.dto';

@Injectable()
export class ChurchesService {

  constructor(
    @InjectRepository(Church) private churchRepository: Repository<Church>,
    @InjectRepository(ChurchPerson)
    private memberRepository: Repository<ChurchPerson>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Person) private personRepository: Repository<Person>,
  ) { }

  async create(userId: string, dto: CreateChurchDto) {
    console.log('ChurchesService.create called');
    // 1. Check slug uniqueness
    const slug = dto.slug || this.generateSlug(dto.name);
    console.log('Checking slug:', slug);
    const existing = await this.churchRepository.findOne({ where: { slug } });
    if (existing) {
      console.log('Slug taken:', slug);
      throw new BadRequestException('El identificador de la iglesia (slug) ya está en uso. Por favor elige otro.');
    }

    // 2. Create Church
    console.log('Creating church entity...');
    const church = this.churchRepository.create({
      name: dto.name,
      slug,
      address: dto.address,
      city: dto.city,
      state: dto.state,
      country: dto.country,
      timezone: dto.timezone ?? 'America/Argentina/Buenos_Aires',
      baseCurrency: dto.baseCurrency ?? Currency.ARS,
      accountDonation: dto.accountDonation,
      logoUrl: dto.logoUrl,
      coverUrl: dto.coverUrl,
      plan: PlanType.TRIAL,
      subscriptionStatus: SubscriptionStatus.TRIAL,
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
          firstName: user.email.split('@')[0], // Fallback name
          lastName: '',
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

    const normalizedQuery = query
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // elimina acentos
      .replace(/[^a-z0-9]/g, ''); // elimina TODO excepto letras y números

    return this.churchRepository
      .createQueryBuilder('church')
      .where(
        `
        REGEXP_REPLACE(LOWER(unaccent(church.name)), '[^a-z0-9]', '', 'g') LIKE :query
        OR REGEXP_REPLACE(LOWER(unaccent(church.city)), '[^a-z0-9]', '', 'g') LIKE :query
        OR REGEXP_REPLACE(LOWER(unaccent(church.address)), '[^a-z0-9]', '', 'g') LIKE :query
        OR REGEXP_REPLACE(LOWER(unaccent(church.slug)), '[^a-z0-9]', '', 'g') LIKE :query
        `,
        {
          query: `%${normalizedQuery}%`,
        },
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
    if (dto.accountDonation !== undefined) church.accountDonation = dto.accountDonation;

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
