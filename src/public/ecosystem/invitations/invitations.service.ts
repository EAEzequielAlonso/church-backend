import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as crypto from 'crypto';
import {
  Invitation,
  InvitationStatus,
  InvitationType,
} from '../entities/invitation.entity';
import { Person } from '../../../core/users/entities/person.entity';
import { EcosystemHistory } from '../entities/ecosystem-history.entity';
import { EcosystemContributionType } from '../enums/ecosystem.enums';
import { EcosystemContributionsService } from '../services/ecosystem-contributions.service';
import { AuthService } from '../../../core/auth/auth.service';
import { EmailService } from '../../../core/auth/email.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { RegisterFromInvitationDto } from './dto/register-from-invitation.dto';
import { EcosystemHistoryEvent } from '../../enums/public.enums';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChurchOwnershipService } from '../../../public/church/services/church-ownership.service';

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    @InjectRepository(Invitation)
    private readonly invitationRepository: Repository<Invitation>,
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(EcosystemHistory)
    private readonly historyRepository: Repository<EcosystemHistory>,
    private readonly contributionsService: EcosystemContributionsService,
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    private readonly churchOwnershipService: ChurchOwnershipService,
  ) {}

  async createInvitation(
    inviterPersonId: string,
    dto: CreateInvitationDto,
  ): Promise<Invitation> {
    if (dto.type !== InvitationType.GENERAL_USER && !dto.invitedEmail) {
      throw new BadRequestException(
        'Para este tipo de invitación se requiere un email.',
      );
    }

    if (dto.invitedEmail) {
      const existingInvitation = await this.invitationRepository.findOne({
        where: {
          invitedEmail: dto.invitedEmail,
          targetChurchId: dto.targetChurchId || null,
          type: dto.type,
          status: InvitationStatus.PENDING,
        },
      });

      if (existingInvitation) {
        throw new ConflictException(
          'Ya existe una invitación pendiente con las mismas características para este email.',
        );
      }
    }

    if (dto.type === InvitationType.CHURCH_MEMBERSHIP) {
      if (!dto.targetChurchId) {
        throw new BadRequestException(
          'Para invitar a la iglesia se requiere targetChurchId.',
        );
      }
      await this.churchOwnershipService.assertOwnsChurch(
        inviterPersonId,
        dto.targetChurchId,
      );
    }

    // 1. Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    // 2. Save invitation
    const invitation = this.invitationRepository.create({
      type: dto.type,
      status: InvitationStatus.PENDING,
      inviterPersonId,
      targetChurchId: dto.targetChurchId,
      invitedEmail: dto.invitedEmail,
      token,
      expiresAt,
    });

    const savedInvitation = await this.invitationRepository.save(invitation);

    // 3. Send email only if provided (fire-and-forget)
    if (dto.invitedEmail) {
      void this.emailService.sendInvitationLink(dto.invitedEmail, token);
    }

    return savedInvitation;
  }

  async getInvitationByToken(token: string): Promise<Invitation> {
    const invitation = await this.invitationRepository.findOne({
      where: { token },
      relations: ['inviterPerson', 'targetChurch'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada');
    }

    return invitation;
  }

  async registerFromInvitation(dto: RegisterFromInvitationDto): Promise<void> {
    // START TRANSACTION
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Validar invitación
      const invitation = await queryRunner.manager.findOne(Invitation, {
        where: { token: dto.inviteToken },
        lock: { mode: 'pessimistic_write' },
      });

      if (!invitation) {
        throw new BadRequestException('El token de invitación es inválido');
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        throw new BadRequestException(
          'La invitación ya ha sido utilizada, cancelada o expirada',
        );
      }

      if (invitation.expiresAt && new Date() > invitation.expiresAt) {
        invitation.status = InvitationStatus.EXPIRED;
        await queryRunner.manager.save(invitation);
        throw new BadRequestException('La invitación ha expirado');
      }

      // Validar email si la invitación está restringida
      if (
        invitation.invitedEmail &&
        invitation.invitedEmail.toLowerCase() !== dto.email.toLowerCase()
      ) {
        throw new BadRequestException(
          'The invitation does not belong to this email address.',
        );
      }

      // 2. Delegar registro a AuthService
      await this.authService.registerUser(dto);

      // 3. Retrieve the newly created Person
      const newPerson = await queryRunner.manager.findOne(Person, {
        where: { email: dto.email },
      });

      if (!newPerson) {
        throw new Error(
          'No se pudo localizar el perfil asociado tras el registro',
        );
      }

      // 4. Update Invitation
      invitation.status = InvitationStatus.ACCEPTED;
      invitation.acceptedByPersonId = newPerson.id;
      invitation.acceptedAt = new Date();
      await queryRunner.manager.save(invitation);

      // 5. Record Contribution for Inviter mapping invitation type
      let contributionType: EcosystemContributionType;
      switch (invitation.type) {
        case InvitationType.CHURCH_ADMIN_CLAIM:
          contributionType = EcosystemContributionType.CHURCH_ADMIN_INVITED;
          break;
        case InvitationType.CHURCH_MEMBERSHIP:
          contributionType = EcosystemContributionType.CHURCH_MEMBER_INVITED;
          break;
        case InvitationType.NEED_SIGNAL_USER:
          contributionType = EcosystemContributionType.NEED_SIGNAL_INVITED;
          break;
        case InvitationType.GENERAL_USER:
        default:
          contributionType = EcosystemContributionType.USER_INVITED;
          break;
      }

      await this.contributionsService.recordContribution({
        actorPersonId: invitation.inviterPersonId,
        targetChurchId: invitation.targetChurchId,
        type: contributionType,
        metadata: {
          invitationId: invitation.id,
          invitedPersonId: newPerson.id,
          invitedEmail: invitation.invitedEmail,
        },
        manager: queryRunner.manager,
      });

      // 6. Record Ecosystem History
      await queryRunner.manager.save(
        this.historyRepository.create({
          personId: newPerson.id,
          churchId: invitation.targetChurchId,
          eventType: EcosystemHistoryEvent.INVITATION_ACCEPTED,
        }),
      );

      this.eventEmitter.emit('invitation.accepted', {
        invitation,
        invitedPersonId: newPerson.id,
        inviterPersonId: invitation.inviterPersonId,
        newUserName: newPerson.firstName,
      });

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async resendInvitation(
    id: string,
    inviterPersonId: string,
  ): Promise<Invitation> {
    const invitation = await this.invitationRepository.findOne({
      where: { id, inviterPersonId },
    });

    if (!invitation) {
      throw new NotFoundException(
        'Invitación no encontrada o no tienes permisos para reenviarla.',
      );
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        'Solo se pueden reenviar invitaciones pendientes.',
      );
    }

    // Incrementar contador
    invitation.reminderCount += 1;
    const savedInvitation = await this.invitationRepository.save(invitation);

    // Reenviar email (fire-and-forget)
    void this.emailService.sendInvitationLink(
      invitation.invitedEmail,
      invitation.token,
    );

    return savedInvitation;
  }

  async acceptInvitation(userId: string, token: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const invitation = await queryRunner.manager.findOne(Invitation, {
        where: { token },
        lock: { mode: 'pessimistic_write' },
      });

      if (!invitation) throw new BadRequestException('Token inválido');

      if (invitation.status !== InvitationStatus.PENDING) {
        throw new BadRequestException(
          'La invitación ya ha sido utilizada, cancelada o expirada',
        );
      }

      if (invitation.expiresAt && new Date() > invitation.expiresAt) {
        invitation.status = InvitationStatus.EXPIRED;
        await queryRunner.manager.save(invitation);
        throw new BadRequestException('La invitación expiró');
      }

      const person = await queryRunner.manager.findOne(Person, {
        where: { user: { id: userId } },
        relations: ['user'],
      });

      if (!person)
        throw new BadRequestException(
          'No se localizó el perfil asociado al usuario.',
        );

      if (
        invitation.invitedEmail &&
        invitation.invitedEmail.toLowerCase() !==
          person.user.email.toLowerCase()
      ) {
        throw new BadRequestException(
          'El email de la invitación no coincide con el de tu cuenta.',
        );
      }

      invitation.status = InvitationStatus.ACCEPTED;
      invitation.acceptedByPersonId = person.id;
      invitation.acceptedAt = new Date();
      await queryRunner.manager.save(invitation);

      let contributionType: EcosystemContributionType;
      switch (invitation.type) {
        case InvitationType.CHURCH_ADMIN_CLAIM:
          contributionType = EcosystemContributionType.CHURCH_ADMIN_INVITED;
          break;
        case InvitationType.CHURCH_MEMBERSHIP:
          contributionType = EcosystemContributionType.CHURCH_MEMBER_INVITED;
          break;
        case InvitationType.NEED_SIGNAL_USER:
          contributionType = EcosystemContributionType.NEED_SIGNAL_INVITED;
          break;
        case InvitationType.GENERAL_USER:
        default:
          contributionType = EcosystemContributionType.USER_INVITED;
          break;
      }

      await this.contributionsService.recordContribution({
        actorPersonId: invitation.inviterPersonId,
        targetChurchId: invitation.targetChurchId,
        type: contributionType,
        metadata: {
          invitationId: invitation.id,
          invitedPersonId: person.id,
          invitedEmail: invitation.invitedEmail,
        },
        manager: queryRunner.manager,
      });

      await queryRunner.manager.save(
        this.historyRepository.create({
          personId: person.id,
          churchId: invitation.targetChurchId,
          eventType: EcosystemHistoryEvent.INVITATION_ACCEPTED,
        }),
      );

      this.eventEmitter.emit('invitation.accepted', {
        invitation,
        invitedPersonId: person.id,
        inviterPersonId: invitation.inviterPersonId,
        newUserName: person.firstName,
      });

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
