import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, EntityManager } from 'typeorm';
import { ChurchPerson } from './entities/church-person.entity';
import { Person } from '../users/entities/person.entity';
import { User } from '../users/entities/user.entity';
import { CreateMemberDto } from './dto/create-member.dto';
import { EcclesiasticalRole, FunctionalRole } from '../common/enums';
import { MembershipStatus } from './enums/membership-status.enum';

@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(ChurchPerson)
    private memberRepository: Repository<ChurchPerson>,
    @InjectRepository(Person) private personRepository: Repository<Person>,
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  async search(churchId: string, query: string) {
    if (!query || query.length < 2) return [];

    return this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.person', 'person')
      .leftJoin('member.church', 'church')
      .where('church.id = :churchId', { churchId })
      .andWhere(
        '(person.fullName ILIKE :search OR person.firstName ILIKE :search OR person.lastName ILIKE :search)',
        { search: `%${query}%` },
      )
      .limit(10)
      .getMany();
  }

  async create(
    createMemberDto: CreateMemberDto,
    churchId: string,
    manager?: EntityManager,
  ) {
    const personRepo = manager
      ? manager.getRepository(Person)
      : this.personRepository;
    const memberRepo = manager
      ? manager.getRepository(ChurchPerson)
      : this.memberRepository;

    const {
      email,
      firstName,
      lastName,
      fullName, // Optional now
      status,
      ecclesiasticalRole,
      functionalRoles,
      documentId,
      phoneNumber,
      birthDate,
    } = createMemberDto;

    let person: Person;

    // Try to find person by email if provided
    if (email) {
      person = await personRepo.findOne({ where: { email } });
    }

    // Try to find by documentId if provided and not found by email
    if (!person && documentId) {
      person = await personRepo.findOne({ where: { documentId } });
    }

    const constructedFullName = fullName || `${firstName} ${lastName}`.trim();

    // Helper for safe date parsing from YYYY-MM-DD
    const parseDate = (d: string) => {
      if (!d) return null;
      const [year, month, day] = d.split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    // Create or Update Person info
    if (!person) {
      person = personRepo.create({
        email: email || null,
        firstName,
        lastName,
        fullName: constructedFullName,
        documentId,
        phoneNumber,
        birthDate: parseDate(birthDate),
      });
      person = await personRepo.save(person);
    } else {
      // Optional: Update existing person details if they were missing or if explicitly authorized
      // For now, we update if fields are missing on the existing person record
      let needsUpdate = false;

      if (!person.firstName && firstName) {
        person.firstName = firstName;
        needsUpdate = true;
      }
      if (!person.lastName && lastName) {
        person.lastName = lastName;
        needsUpdate = true;
      }
      if (!person.fullName && constructedFullName) {
        person.fullName = constructedFullName;
        needsUpdate = true;
      }

      if (!person.phoneNumber && phoneNumber) {
        person.phoneNumber = phoneNumber;
        needsUpdate = true;
      }
      if (!person.documentId && documentId) {
        person.documentId = documentId;
        needsUpdate = true;
      }
      if (!person.birthDate && birthDate) {
        person.birthDate = parseDate(birthDate);
        needsUpdate = true;
      }

      if (needsUpdate) {
        person = await personRepo.save(person);
      }
    }

    const existingMember = await memberRepo.findOne({
      where: {
        person: { id: person.id },
        church: { id: churchId },
      },
    });

    if (existingMember) {
      throw new ConflictException('Esta persona ya es miembro de esta iglesia');
    }

    const member = memberRepo.create({
      person,
      church: { id: churchId },
      ecclesiasticalRole: ecclesiasticalRole || EcclesiasticalRole.NONE,
      functionalRoles: functionalRoles || [FunctionalRole.MEMBER],
      membershipStatus: status || MembershipStatus.MEMBER,
      joinedAt: new Date(),
    });

    return memberRepo.save(member);
  }

  async findAll(churchId: string, status?: MembershipStatus) {
    const query = this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.person', 'person')
      .leftJoinAndSelect('person.user', 'user')
      .leftJoin('member.church', 'church')
      .where('church.id = :churchId', { churchId });

    if (status) {
      query.andWhere('member.membershipStatus = :status', { status });
    }

    return query.getMany();
  }

  async findOne(id: string, churchId: string) {
    const member = await this.memberRepository.findOne({
      where: { id, church: { id: churchId } },
      relations: ['person', 'person.user'],
    });

    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  async getMemberDetails(id: string, churchId: string) {
    const member = await this.findOne(id, churchId);

    const counselingStats = {
      total: 0,
      open: 0,
      closed: 0,
    };

    const discipleshipStats = {
      status: 'Not started',
      level: 0,
    };

    return {
      ...member,
      counselingStats,
      discipleshipStats,
    };
  }

  async update(
    id: string,
    updateData: any,
    churchId: string,
    actingMemberId?: string,
  ) {
    const member = await this.memberRepository.findOne({
      where: { id, church: { id: churchId } },
      relations: ['person', 'person.user'],
    });
    if (!member) throw new NotFoundException('Member not found');

    // Security check: Prevent self-demotion from ADMIN_CHURCH
    if (actingMemberId && actingMemberId === id) {
      const hasAdminRole = member.functionalRoles?.includes(
        FunctionalRole.ADMIN_CHURCH,
      );
      const isRemovingAdmin =
        updateData.functionalRoles &&
        !updateData.functionalRoles.includes(FunctionalRole.ADMIN_CHURCH);

      if (hasAdminRole && isRemovingAdmin) {
        throw new ForbiddenException(
          'No puedes quitarte el rol de Administrador de Iglesia a ti mismo. Otro administrador debe hacerlo.',
        );
      }
    }

    if (updateData.status) {
      member.membershipStatus = updateData.status;
    }

    if (updateData.ecclesiasticalRole) {
      member.ecclesiasticalRole = updateData.ecclesiasticalRole;
    }

    if (updateData.functionalRoles) {
      member.functionalRoles = updateData.functionalRoles;
    }

    const parseDate = (d: string) => {
      if (!d) return null;
      if (d.includes('T')) return new Date(d); // Already ISO
      const [year, month, day] = d.split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    // Allow updating Person details if NO user is associated
    if (!member.person.user) {
      let personUpdated = false;

      if (
        updateData.firstName !== undefined &&
        member.person.firstName !== updateData.firstName
      ) {
        member.person.firstName = updateData.firstName;
        personUpdated = true;
      }
      if (
        updateData.lastName !== undefined &&
        member.person.lastName !== updateData.lastName
      ) {
        member.person.lastName = updateData.lastName;
        personUpdated = true;
      }

      // Auto update fullName if firstName or lastName changed
      if (personUpdated) {
        member.person.fullName =
          `${member.person.firstName} ${member.person.lastName}`.trim();
      }

      // Also allow explicit fullName update
      if (
        updateData.fullName !== undefined &&
        member.person.fullName !== updateData.fullName
      ) {
        member.person.fullName = updateData.fullName;
        personUpdated = true;
      }

      if (
        updateData.email !== undefined &&
        member.person.email !== updateData.email
      ) {
        member.person.email = updateData.email;
        personUpdated = true;
      }
      if (
        updateData.phoneNumber !== undefined &&
        member.person.phoneNumber !== updateData.phoneNumber
      ) {
        member.person.phoneNumber = updateData.phoneNumber;
        personUpdated = true;
      }
      if (
        updateData.documentId !== undefined &&
        member.person.documentId !== updateData.documentId
      ) {
        member.person.documentId = updateData.documentId;
        personUpdated = true;
      }
      if (updateData.birthDate !== undefined) {
        member.person.birthDate = parseDate(updateData.birthDate);
        personUpdated = true;
      }

      if (personUpdated) {
        await this.personRepository.save(member.person);
      }
    }

    return this.memberRepository.save(member);
  }

  async remove(id: string, churchId: string) {
    const member = await this.findOne(id, churchId);
    try {
      return await this.memberRepository.remove(member);
    } catch (error) {
      if (error.code === '23503') {
        // Foreign Key Violation
        throw new ConflictException(
          'No se puede eliminar este miembro porque tiene registros asociados (como asistencias, grupos o ministerios). Te sugerimos ARCHIVARLO en su lugar para mantener la integridad de los datos.',
        );
      }
      throw error;
    }
  }

  async requestJoin(userId: string, personId: string, targetChurchId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['person'],
    });
    if (!user) throw new NotFoundException('User not found');

    let person = user.person;
    if (!person) {
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
          fullName: user.email.split('@')[0],
        });
        person = await this.personRepository.save(person);
        user.person = person;
        await this.userRepository.save(user);
      }
    }

    const existingMember = await this.memberRepository.findOne({
      where: {
        person: { id: personId },
        church: { id: targetChurchId },
      },
    });

    if (existingMember) {
      throw new ConflictException('Already a member or pending approval');
    }

    const member = this.memberRepository.create({
      person: person,
      church: { id: targetChurchId },
      ecclesiasticalRole: EcclesiasticalRole.NONE,
      membershipStatus: MembershipStatus.MEMBER, // Pending/Prospect
    });

    const savedMember = await this.memberRepository.save(member);

    if (user) {
      user.isOnboarded = true;
      await this.userRepository.save(user);
    }

    return savedMember;
  }

  async createFromVisitor(
    visitor: any,
    churchId: string,
    status: MembershipStatus = MembershipStatus.MEMBER,
  ) {
    // 1. Check if Person exists by email (if available)
    let person: Person | null = null;
    if (visitor.email) {
      person = await this.personRepository.findOne({
        where: { email: visitor.email },
      });
    }

    // 2. Create Person if not exists
    if (!person) {
      person = this.personRepository.create({
        firstName: visitor.firstName,
        lastName: visitor.lastName,
        fullName: `${visitor.firstName} ${visitor.lastName}`.trim(),
        email: visitor.email || null,
        phoneNumber: visitor.phone || null,
      });
      person = await this.personRepository.save(person);
    }

    // 3. Check if already member
    const existingMember = await this.memberRepository.findOne({
      where: {
        person: { id: person.id },
        church: { id: churchId },
      },
    });

    if (existingMember) {
      return existingMember; // Almost idempotent, return existing
    }

    // 4. Create Member
    const member = this.memberRepository.create({
      person,
      church: { id: churchId },
      ecclesiasticalRole: EcclesiasticalRole.NONE,
      // Default roles for new member
      functionalRoles: [FunctionalRole.MEMBER],
      membershipStatus: status,
      joinedAt: new Date(),
    });

    return this.memberRepository.save(member);
  }
}
