import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { NotificationType } from '../enums/notification.enum';
import { EmailService } from 'src/core/auth/email.service';
import { User } from 'src/core/users/entities/user.entity';
import { In } from 'typeorm';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  private async getUserIdByPersonId(personId: string): Promise<string | null> {
    const user = await this.userRepo.findOne({
      where: { person: { id: personId } },
    });
    return user ? user.id : null;
  }

  private async getUserIdsByPersonIds(personIds: string[]): Promise<string[]> {
    if (!personIds.length) return [];
    const users = await this.userRepo.find({
      where: { person: { id: In(personIds) } },
    });
    return users.map((u) => u.id);
  }

  @OnEvent('church-claim.approved')
  async handleChurchClaimApproved(payload: {
    recipientPersonId: string;
    email?: string;
    churchName: string;
  }) {
    const userId = await this.getUserIdByPersonId(payload.recipientPersonId);
    if (userId) {
      await this.notificationRepo.save(
        this.notificationRepo.create({
          userId: userId,
          type: NotificationType.CHURCH_CLAIM_APPROVED,
          title: 'Solicitud de administración aprobada',
          message: `Ahora podés administrar el perfil de ${payload.churchName}.`,
          read: false,
        }),
      );
    }

    if (payload.email) {
      void this.emailService.sendNotificationEmail(
        payload.email,
        'Solicitud de administración aprobada',
        `Ahora podés administrar el perfil de ${payload.churchName}.`,
      );
    }
  }

  @OnEvent('church-claim.rejected')
  async handleChurchClaimRejected(payload: {
    recipientPersonId: string;
    email?: string;
    churchName: string;
    notes: string;
  }) {
    const userId = await this.getUserIdByPersonId(payload.recipientPersonId);
    const message = `Tu solicitud para administrar ${payload.churchName} fue rechazada.\nMotivo: ${payload.notes}`;

    if (userId) {
      await this.notificationRepo.save(
        this.notificationRepo.create({
          userId: userId,
          type: NotificationType.CHURCH_CLAIM_REJECTED,
          title: 'Solicitud de administración rechazada',
          message,
          read: false,
        }),
      );
    }

    if (payload.email) {
      void this.emailService.sendNotificationEmail(
        payload.email,
        'Solicitud de administración rechazada',
        message,
      );
    }
  }

  @OnEvent('invitation.accepted')
  async handleInvitationAccepted(payload: {
    inviterPersonId: string;
    newUserName: string;
  }) {
    const userId = await this.getUserIdByPersonId(payload.inviterPersonId);
    if (userId) {
      await this.notificationRepo.save(
        this.notificationRepo.create({
          userId: userId,
          type: NotificationType.INVITATION_ACCEPTED,
          title: 'Invitación Aceptada',
          message: `${payload.newUserName} ha aceptado tu invitación y se ha unido a Telyon.`,
          read: false,
        }),
      );
    }
  }

  @OnEvent('personal-need.supported')
  async handlePersonalNeedSupported(payload: {
    recipientPersonId: string;
    email?: string;
    supporterName: string;
    needTitle: string;
  }) {
    const userId = await this.getUserIdByPersonId(payload.recipientPersonId);
    if (userId) {
      await this.notificationRepo.save(
        this.notificationRepo.create({
          userId: userId,
          type: NotificationType.PERSONAL_NEED_SUPPORTED,
          title: 'Alguien quiere apoyarte',
          message: `${payload.supporterName} ha respondido a tu necesidad: ${payload.needTitle}.`,
          read: false,
        }),
      );
    }

    if (payload.email) {
      void this.emailService.sendNotificationEmail(
        payload.email,
        'Alguien quiere apoyarte',
        `${payload.supporterName} ha respondido a tu necesidad: ${payload.needTitle}.`,
      );
    }
  }

  @OnEvent('mission.collaboration.joined')
  async handleMissionCollaborationJoined(payload: {
    recipientPersonId: string;
    churchName: string;
    missionName: string;
  }) {
    const userId = await this.getUserIdByPersonId(payload.recipientPersonId);
    if (userId) {
      await this.notificationRepo.save(
        this.notificationRepo.create({
          userId: userId, // Mision leader or mission creator
          type: NotificationType.MISSION_COLLABORATION_JOINED,
          title: 'Nueva colaboración en tu misión',
          message: `La iglesia ${payload.churchName} se ha unido a tu misión: ${payload.missionName}.`,
          read: false,
        }),
      );
    }
  }

  @OnEvent('mission.need.created')
  async handleMissionNeedCreated(payload: {
    recipientPersonIds: string[];
    missionName: string;
    needType: string;
  }) {
    const userIds = await this.getUserIdsByPersonIds(
      payload.recipientPersonIds,
    );
    const notifications = userIds.map((userId) =>
      this.notificationRepo.create({
        userId: userId,
        type: NotificationType.MISSION_NEED_CREATED,
        title: 'Nueva necesidad en la misión que apoyas',
        message: `La misión ${payload.missionName} ha publicado una nueva necesidad.`,
        payload: {
          missionName: payload.missionName,
          needType: payload.needType,
        },
        read: false,
      }),
    );

    if (notifications.length > 0) {
      await this.notificationRepo.save(notifications);
    }
  }

  @OnEvent('mission.cancelled')
  async handleMissionCancelled(payload: {
    recipientPersonIds: string[];
    missionName: string;
  }) {
    const userIds = await this.getUserIdsByPersonIds(
      payload.recipientPersonIds,
    );
    const notifications = userIds.map((userId) =>
      this.notificationRepo.create({
        userId: userId,
        type: NotificationType.MISSION_CANCELLED,
        title: 'Misión Cancelada',
        message: `La misión ${payload.missionName} ha sido cancelada.`,
        read: false,
      }),
    );

    if (notifications.length > 0) {
      await this.notificationRepo.save(notifications);
    }
  }

  @OnEvent('community.join.request')
  async handleCommunityJoinRequest(payload: {
    adminPersonIds: string[];
    churchName: string;
    requesterName: string;
    relationType: string;
  }) {
    const userIds = await this.getUserIdsByPersonIds(payload.adminPersonIds);
    const notifications = userIds.map((userId) =>
      this.notificationRepo.create({
        userId,
        type: NotificationType.COMMUNITY_JOIN_REQUEST,
        title: 'Nueva solicitud de comunidad',
        message: `${payload.requesterName} solicitó unirse a ${payload.churchName}.`,
        payload: {
          requesterName: payload.requesterName,
          churchName: payload.churchName,
          relationType: payload.relationType,
        },
        read: false,
      }),
    );

    if (notifications.length > 0) {
      await this.notificationRepo.save(notifications);
    }
  }

  @OnEvent('community.join.approved')
  async handleCommunityJoinApproved(payload: {
    recipientPersonId: string;
    churchName: string;
    relationType: string;
  }) {
    const userId = await this.getUserIdByPersonId(payload.recipientPersonId);
    if (userId) {
      await this.notificationRepo.save(
        this.notificationRepo.create({
          userId,
          type: NotificationType.COMMUNITY_JOIN_APPROVED,
          title: 'Solicitud aprobada',
          message: `Tu solicitud para unirte a ${payload.churchName} fue aprobada.`,
          payload: {
            churchName: payload.churchName,
            relationType: payload.relationType,
          },
          read: false,
        }),
      );
    }
  }

  @OnEvent('community.join.rejected')
  async handleCommunityJoinRejected(payload: {
    recipientPersonId: string;
    churchName: string;
  }) {
    const userId = await this.getUserIdByPersonId(payload.recipientPersonId);
    if (userId) {
      await this.notificationRepo.save(
        this.notificationRepo.create({
          userId,
          type: NotificationType.COMMUNITY_JOIN_REJECTED,
          title: 'Solicitud no aprobada',
          message: `Tu solicitud para unirte a ${payload.churchName} no fue aprobada.`,
          read: false,
        }),
      );
    }
  }

  @OnEvent('community.role.updated')
  async handleCommunityRoleUpdated(payload: {
    recipientPersonId: string;
    churchName: string;
    newRole: string;
  }) {
    const userId = await this.getUserIdByPersonId(payload.recipientPersonId);
    if (userId) {
      await this.notificationRepo.save(
        this.notificationRepo.create({
          userId,
          type: NotificationType.ECCLESIAL_ROLE_UPDATED,
          title: 'Rol actualizado',
          message: `Tu rol eclesiástico en ${payload.churchName} fue actualizado.`,
          payload: {
            churchName: payload.churchName,
            role: payload.newRole,
          },
          read: false,
        }),
      );
    }
  }

  @OnEvent('community.relation.removed')
  async handleCommunityRelationRemoved(payload: {
    recipientPersonId: string;
    churchName: string;
  }) {
    const userId = await this.getUserIdByPersonId(payload.recipientPersonId);
    if (userId) {
      await this.notificationRepo.save(
        this.notificationRepo.create({
          userId,
          type: NotificationType.COMMUNITY_RELATION_REMOVED,
          title: 'Removido de la comunidad',
          message: `Fuiste removido de la comunidad de ${payload.churchName}.`,
          read: false,
        }),
      );
    }
  }
}
