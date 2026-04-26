import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, EntityManager } from 'typeorm';
import { ChurchPerson } from './entities/church-person.entity';
import { JoinRequest, JoinRequestStatus } from './entities/join-request.entity';
import { Person } from '../users/entities/person.entity';
import { User } from '../users/entities/user.entity';
import { CreateMemberDto } from './dto/create-member.dto';
import { EcclesiasticalRole, FunctionalRole } from '../common/enums';
import { MembershipStatus } from './enums/membership-status.enum';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';
import { EmailService } from '../auth/email.service';
import { AuthService } from '../auth/auth.service';
import { v4 as uuidv4 } from 'uuid';
import { ApproveMemberDto } from './dto/approve-member.dto';

@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(ChurchPerson)
    private memberRepository: Repository<ChurchPerson>,
    @InjectRepository(JoinRequest)
    private joinRequestRepository: Repository<JoinRequest>,
    @InjectRepository(Person) private personRepository: Repository<Person>,
    @InjectRepository(User) private userRepository: Repository<User>,
    private readonly subService: SubscriptionsService,
    private readonly emailService: EmailService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) { }

  async search(churchId: string, query: string) {
    if (!query || query.length < 2) return [];

    return this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.person', 'person')
      .leftJoin('member.church', 'church')
      .where('church.id = :churchId', { churchId })
      .andWhere(
        '(concat(person.firstName, \' \', person.lastName) ILIKE :search OR person.firstName ILIKE :search OR person.lastName ILIKE :search)',
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
    const usage = await this.subService.getSubscriptionUsage(churchId);
    if (usage.limit !== null && usage.currentMembers >= usage.limit) {
      throw new ForbiddenException(
        'Has alcanzado el límite de miembros de tu plan. Actualiza tu suscripción para continuar.',
      );
    }

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
      status,
      ecclesiasticalRole,
      functionalRoles,
      documentId,
      phoneNumber,
      birthDate,
    } = createMemberDto;

    let person: Person;

    if (email) {
      person = await personRepo.findOne({ where: { email } });
    }

    if (!person && documentId) {
      person = await personRepo.findOne({ where: { documentId } });
    }

    // No longer using fullName

    const parseDate = (d: string) => {
      if (!d) return null;
      const [year, month, day] = d.split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    if (!person) {
      person = personRepo.create({
        email: email || null,
        firstName,
        lastName,
        documentId,
        phoneNumber,
        birthDate: parseDate(birthDate),
      });
      person = await personRepo.save(person);
    } else {
      let needsUpdate = false;
      if (!person.firstName && firstName) { person.firstName = firstName; needsUpdate = true; }
      if (!person.lastName && lastName) { person.lastName = lastName; needsUpdate = true; }
      // Removed fullName update
      if (!person.phoneNumber && phoneNumber) { person.phoneNumber = phoneNumber; needsUpdate = true; }
      if (!person.documentId && documentId) { person.documentId = documentId; needsUpdate = true; }
      if (!person.birthDate && birthDate) { person.birthDate = parseDate(birthDate); needsUpdate = true; }
      if (needsUpdate) {
        person = await personRepo.save(person);
      }
    }

    const existingMember = await memberRepo.findOne({
      where: { person: { id: person.id }, churchId },
    });

    if (existingMember) {
      throw new ConflictException('Esta persona ya es miembro de esta iglesia');
    }

    const member = memberRepo.create({
      person,
      churchId,
      ecclesiasticalRole: ecclesiasticalRole || EcclesiasticalRole.NONE,
      functionalRoles: functionalRoles || [FunctionalRole.MEMBER],
      membershipStatus: status || MembershipStatus.MEMBER,
      joinedAt: new Date(),
    });

    return memberRepo.save(member);
  }

  async findAll(churchId: string, status?: MembershipStatus, role?: FunctionalRole) {
    const query = this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.person', 'person')
      .leftJoinAndSelect('person.user', 'user')
      .leftJoin('member.church', 'church')
      .where('church.id = :churchId', { churchId });

    if (status) {
      query.andWhere('member.membershipStatus = :status', { status });
    }

    if (role) {
      query.andWhere(':role = ANY(member.functionalRoles)', { role });
    }

    query.addOrderBy(
      `CASE 
        WHEN member.ecclesiasticalRole = 'PASTOR' THEN 1 
        WHEN member.ecclesiasticalRole = 'BISHOP' THEN 2 
        WHEN member.ecclesiasticalRole = 'ELDER' THEN 3 
        WHEN member.ecclesiasticalRole = 'DEACON' THEN 4 
        ELSE 5 
      END`,
      'ASC'
    ).addOrderBy('person.lastName', 'ASC')
      .addOrderBy('person.firstName', 'ASC');

    return query.getMany();
  }

  async getUnassignedFollowUps(churchId: string) {
    // Unassigned follow-ups are visitors/prospects who do NOT have an active FOLLOW_UP mentorship process.
    return this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.person', 'person')
      .leftJoinAndSelect('person.user', 'user')
      .leftJoin('member.church', 'church')
      .where('church.id = :churchId', { churchId })
      .andWhere('member.membershipStatus IN (:...statuses)', { statuses: [MembershipStatus.VISITOR, MembershipStatus.PROSPECT] })
      .andWhere((qb) => {
        const subQuery = qb.subQuery()
          .select('mpp.churchPersonId')
          .from('mentorship_process_participants', 'mpp')
          .innerJoin('mpp.process', 'mp', 'mp.status = :activeStatus AND mp.type = :followUpType')
          .getQuery();
        return `member.id NOT IN ${subQuery}`;
      })
      .setParameter('activeStatus', 'ACTIVE') // Using literal string since MentorshipStatus enum might not be imported here
      .setParameter('followUpType', 'FOLLOW_UP')
      .getMany();
  }

  async findOne(id: string, churchId: string) {
    const member = await this.memberRepository.findOne({
      where: { id, churchId },
      relations: ['person', 'person.user', 'church'],
    });
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  async getMemberDetails(id: string, churchId: string) {
    const member = await this.findOne(id, churchId);
    const counselingStats = { total: 0, asConselor: 0, asCounselee: 0 };
    const discipleshipStats = { total: 0, asMentor: 0, asMentee: 0 };
    return { ...member, counselingStats, discipleshipStats };
  }

  async update(
    id: string,
    updateData: any,
    churchId: string,
    actingMemberId?: string,
  ) {
    const member = await this.memberRepository.findOne({
      where: { id, churchId },
      relations: ['person', 'person.user'],
    });
    if (!member) throw new NotFoundException('Member not found');

    if (actingMemberId && actingMemberId === id) {
      const hasAdminRole = member.functionalRoles?.includes(FunctionalRole.ADMIN_CHURCH);
      const isRemovingAdmin = updateData.functionalRoles && !updateData.functionalRoles.includes(FunctionalRole.ADMIN_CHURCH);
      if (hasAdminRole && isRemovingAdmin) {
        throw new ForbiddenException(
          'No puedes quitarte el rol de Administrador de Iglesia a ti mismo. Otro administrador debe hacerlo.',
        );
      }
    }

    if (updateData.status) member.membershipStatus = updateData.status;
    if (updateData.ecclesiasticalRole) member.ecclesiasticalRole = updateData.ecclesiasticalRole;
    if (updateData.functionalRoles) member.functionalRoles = updateData.functionalRoles;

    const parseDate = (d: string) => {
      if (!d) return null;
      const [year, month, day] = d.split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    if (member.person) {
      let personUpdated = false;
      if (updateData.firstName !== undefined && member.person.firstName !== updateData.firstName) {
        member.person.firstName = updateData.firstName; personUpdated = true;
      }
      if (updateData.lastName !== undefined && member.person.lastName !== updateData.lastName) {
        member.person.lastName = updateData.lastName; personUpdated = true;
      }
      if (updateData.email !== undefined && member.person.email !== updateData.email) {
        member.person.email = updateData.email; personUpdated = true;
      }
      if (updateData.phoneNumber !== undefined && member.person.phoneNumber !== updateData.phoneNumber) {
        member.person.phoneNumber = updateData.phoneNumber; personUpdated = true;
      }
      if (updateData.documentId !== undefined && member.person.documentId !== updateData.documentId) {
        member.person.documentId = updateData.documentId; personUpdated = true;
      }
      if (updateData.birthDate !== undefined) {
        member.person.birthDate = parseDate(updateData.birthDate); personUpdated = true;
      }
      if (personUpdated) await this.personRepository.save(member.person);
    }

    return this.memberRepository.save(member);
  }

  async remove(id: string, churchId: string) {
    const member = await this.findOne(id, churchId);
    try {
      return await this.memberRepository.remove(member);
    } catch (error) {
      if (error.code === '23503') {
        throw new ConflictException(
          'No se puede eliminar este miembro porque tiene registros asociados (como asistencias, grupos o ministerios). Te sugerimos ARCHIVARLO en su lugar para mantener la integridad de los datos.',
        );
      }
      throw error;
    }
  }

  // ==========================================
  // JOIN REQUEST METHODS (nueva tabla)
  // ==========================================

  async requestJoin(userId: string, targetChurchId: string) {
    const usage = await this.subService.getSubscriptionUsage(targetChurchId);
    if (usage.limit !== null && usage.currentMembers >= usage.limit) {
      throw new ForbiddenException(
        'La iglesia ha alcanzado su límite de miembros. No puede aceptar nuevas solicitudes en este momento.',
      );
    }

    // Ensure user has a person
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
          firstName: user.email.split('@')[0],
          lastName: '',
        });
        person = await this.personRepository.save(person);
        user.person = person;
        await this.userRepository.save(user);
      }
    }

    // Check if already a member of this church
    const existingMember = await this.memberRepository.findOne({
      where: { person: { id: person.id }, churchId: targetChurchId },
    });

    if (existingMember) {
      // If already a member, return fresh token so frontend can update immediately
      const tokenData = await this.authService.generateTokenForUser(user);
      return {
        status: 'ALREADY_MEMBER',
        message: 'Ya eres miembro de esta iglesia. Tu sesión se actualizará automáticamente.',
        ...tokenData
      };
    }

    // Check if there's already a PENDING request (for any church)
    const existingPending = await this.joinRequestRepository.findOne({
      where: { userId, status: JoinRequestStatus.PENDING },
      relations: ['church'],
    });
    if (existingPending) {
      throw new ConflictException(
        `Ya tienes una solicitud pendiente para la iglesia: ${existingPending.church.name}`,
      );
    }

    // Cleanup: delete any previous REJECTED requests
    await this.joinRequestRepository.delete({
      userId,
      status: JoinRequestStatus.REJECTED,
    });

    // Create the join request
    const joinRequest = this.joinRequestRepository.create({
      userId,
      churchId: targetChurchId,
      status: JoinRequestStatus.PENDING,
    });

    return this.joinRequestRepository.save(joinRequest);
  }

  async getPendingRequests(churchId: string) {
    return this.joinRequestRepository.find({
      where: { churchId, status: JoinRequestStatus.PENDING },
      relations: ['user', 'user.person'],
      order: { createdAt: 'ASC' },
    });
  }

  async approveMember(joinRequestId: string, churchId: string, payload: ApproveMemberDto) {
    const joinRequest = await this.joinRequestRepository.findOne({
      where: { id: joinRequestId, churchId },
      relations: ['user', 'user.person'],
    });

    if (!joinRequest) throw new NotFoundException('Solicitud no encontrada');
    if (joinRequest.status !== JoinRequestStatus.PENDING) {
      throw new ConflictException('Esta solicitud no está en estado pendiente');
    }

    const person = joinRequest.user.person;
    if (!person) {
      throw new ConflictException('El usuario no tiene un perfil asociado');
    }

    // Check subscription limit
    const usage = await this.subService.getSubscriptionUsage(churchId);
    if (usage.limit !== null && usage.currentMembers >= usage.limit) {
      throw new ForbiddenException('Has alcanzado el límite de miembros de tu plan.');
    }

    // Create ChurchPerson (real membership)
    const member = this.memberRepository.create({
      person,
      churchId,
      membershipStatus: payload.membershipStatus,
      ecclesiasticalRole: payload.ecclesiasticalRole,
      functionalRoles: payload.functionalRoles,
      joinedAt: new Date(),
    });

    const savedMember = await this.memberRepository.save(member);

    // Delete the join request
    await this.joinRequestRepository.remove(joinRequest);

    return savedMember;
  }

  async rejectMember(joinRequestId: string, churchId: string) {
    const joinRequest = await this.joinRequestRepository.findOne({
      where: { id: joinRequestId, churchId },
    });

    if (!joinRequest) throw new NotFoundException('Solicitud no encontrada');

    joinRequest.status = JoinRequestStatus.REJECTED;
    return this.joinRequestRepository.save(joinRequest);
  }

  async createFromVisitor(
    visitor: any,
    churchId: string,
    status: MembershipStatus = MembershipStatus.VISITOR,
  ) {
    const usage = await this.subService.getSubscriptionUsage(churchId);
    if (usage.limit !== null && usage.currentMembers >= usage.limit) {
      throw new ForbiddenException(
        'Has alcanzado el límite de miembros de tu plan. Actualiza tu suscripción para continuar.',
      );
    }

    let person: Person | null = null;
    if (visitor.email) {
      person = await this.personRepository.findOne({ where: { email: visitor.email } });
    }

    if (!person) {
      person = this.personRepository.create({
        firstName: visitor.firstName,
        lastName: visitor.lastName,
        email: visitor.email || null,
        phoneNumber: visitor.phone || null,
      });
      person = await this.personRepository.save(person);
    }

    const existingMember = await this.memberRepository.findOne({
      where: { person: { id: person.id }, churchId },
    });
    if (existingMember) return existingMember;

    const member = this.memberRepository.create({
      person,
      churchId,
      ecclesiasticalRole: EcclesiasticalRole.NONE,
      functionalRoles: [],
      membershipStatus: status,
      joinedAt: new Date(),
    });

    return this.memberRepository.save(member);
  }

  async inviteMember(id: string, churchId: string) {
    const member = await this.memberRepository.findOne({
      where: { id, churchId },
      relations: ['person'],
    });

    if (!member) throw new NotFoundException('Miembro no encontrado');

    const person = member.person;
    if (!person.email) {
      throw new ConflictException('La persona debe tener un correo electrónico configurado para ser invitada');
    }

    const token = uuidv4();
    person.inviteToken = token;
    await this.personRepository.save(person);
    await this.emailService.sendInvitationLink(person.email, token);

    return { message: 'Invitación enviada con éxito' };
  }
}
