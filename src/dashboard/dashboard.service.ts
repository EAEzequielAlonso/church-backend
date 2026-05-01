import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChurchPerson } from '../members/entities/church-person.entity';
import { Church } from '../churches/entities/church.entity';
import { Group } from '../groups/entities/group.entity';
import { MembershipStatus } from '../members/enums/membership-status.enum';
import {
  WorshipService,
  ServiceStatus,
} from '../worship/entities/worship-service.entity';
import { CalendarEvent } from '../agenda/entities/calendar-event.entity';
import { Repository, MoreThan, In, MoreThanOrEqual } from 'typeorm';
import { MinistryMember } from '../ministries/entities/ministry-member.entity';
import { GroupParticipant } from '../groups/entities/group-participant.entity';
import { MentorshipProcess } from '../mentorship/entities/mentorship-process.entity';
import { MentorshipStatus, } from '../mentorship/enums/mentorship.enum';
import { MentorshipProcessParticipant } from '../mentorship/entities/mentorship-process-participant.entity';
import { startOfDay } from 'date-fns';
import { AgendaService } from '../agenda/agenda.service';

interface DashboardOverviewParams {
  churchId: string;
  personId: string;
  memberId?: string;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(ChurchPerson)
    private memberRepository: Repository<ChurchPerson>,
    @InjectRepository(Church)
    private churchRepo: Repository<Church>,
    @InjectRepository(Group) private groupRepository: Repository<Group>,
    @InjectRepository(WorshipService)
    private worshipRepo: Repository<WorshipService>,
    @InjectRepository(CalendarEvent)
    private eventRepo: Repository<CalendarEvent>,
    @InjectRepository(MinistryMember)
    private ministryMemberRepo: Repository<MinistryMember>,
    @InjectRepository(GroupParticipant)
    private groupParticipantRepo: Repository<GroupParticipant>,
    @InjectRepository(MentorshipProcess)
    private mentorshipProcessRepo: Repository<MentorshipProcess>,
    private agendaService: AgendaService,
  ) { }

  async getStats(churchId: string) {
    const statsRow = await this.memberRepository
      .createQueryBuilder('cp')
      .select('COUNT(*)', 'total')
      .addSelect(
        `COALESCE(SUM(CASE WHEN cp.membershipStatus = :visitorStatus THEN 1 ELSE 0 END), 0)`,
        'visitors',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN cp.membershipStatus = :memberStatus THEN 1 ELSE 0 END), 0)`,
        'members',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN cp.membershipStatus = :invitedStatus THEN 1 ELSE 0 END), 0)`,
        'invited',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN cp.membershipStatus = :prospectStatus THEN 1 ELSE 0 END), 0)`,
        'prospects',
      )
      .where('cp.churchId = :churchId', { churchId })
      .setParameters({
        visitorStatus: MembershipStatus.VISITOR,
        memberStatus: MembershipStatus.MEMBER,
        invitedStatus: MembershipStatus.INVITED,
        prospectStatus: MembershipStatus.PROSPECT,
      })
      .getRawOne();

    const [totalGroups, church] = await Promise.all([
      this.groupRepository.count({
        where: { churchId },
      }),
      this.churchRepo.findOne({
        where: { id: churchId },
        select: ['accountDonation'],
      }),
    ]);

    return {
      church: {
        accountDonation: church?.accountDonation || null,
      },
      members: {
        total: Number(statsRow?.total || 0),
        visitors: Number(statsRow?.visitors || 0),
        invited: Number(statsRow?.invited || 0),
        prospects: Number(statsRow?.prospects || 0),
        members: Number(statsRow?.members || 0),
      },
      groups: {
        total: totalGroups,
        active: totalGroups,
      },
    };
  }

  async getOverview({ churchId, personId, memberId }: DashboardOverviewParams) {
    const resolvedMemberId = memberId || (await this.resolveMemberId(churchId, personId));

    const [stats, upcomingActivities, mentorships] = await Promise.all([
      this.getStats(churchId),
      this.getUpcomingEvents(churchId, personId),
      resolvedMemberId
        ? this.getActiveMentorships(churchId, personId, resolvedMemberId)
        : Promise.resolve([]),
    ]);

    return {
      stats,
      upcomingActivities,
      mentorships,
    };
  }

  private async resolveMemberId(churchId: string, personId: string) {
    const membership = await this.memberRepository.findOne({
      where: { churchId, personId },
      select: ['id'],
    });

    return membership?.id;
  }

  private async getAgendaSummary(
    churchId: string,
    personId: string,
    memberId?: string,
  ) {
    const [ministryMemberships, groupMemberships] = memberId
      ? await Promise.all([
          this.ministryMemberRepo.find({
            where: { memberId },
            select: ['ministryId'],
          }),
          this.groupParticipantRepo.find({
            where: { churchPersonId: memberId },
            select: ['groupId'],
          }),
        ])
      : [[], []];

    const ministryIds = ministryMemberships.map((membership) => membership.ministryId);
    const groupIds = groupMemberships.map((membership) => membership.groupId);
    const minDate = new Date();
    minDate.setHours(0, 0, 0, 0);

    const eventsQuery = this.eventRepo
      .createQueryBuilder('event')
      .leftJoin('event.attendees', 'attendee')
      .select([
        'event.id AS id',
        'event.title AS title',
        'event.startDate AS "startDate"',
        'event.location AS location',
        'event.type AS type',
        'event.ownerId AS "ownerId"',
      ])
      .where('event.startDate >= :minDate', { minDate })
      .andWhere('event.churchId = :churchId', { churchId })
      .andWhere(
        `(
          (event.type = :churchType AND event.ownerId = :churchOwnerId)
          OR event.organizerId = :personId
          OR attendee.id = :personId
          OR (event.type = :ministryType AND event.ownerId IN (:...ministryIds))
          OR (event.type IN (:...groupTypes) AND event.ownerId IN (:...groupIds))
        )`,
        {
          churchType: 'CHURCH',
          churchOwnerId: churchId,
          personId,
          ministryType: 'MINISTRY',
          ministryIds: ministryIds.length > 0 ? ministryIds : ['__none__'],
          groupTypes: ['SMALL_GROUP', 'COURSE', 'ACTIVITY', 'DISCIPLESHIP'],
          groupIds: groupIds.length > 0 ? groupIds : ['__none__'],
        },
      )
      .orderBy('event.startDate', 'ASC')
      .limit(3);

    const rawEvents = await eventsQuery.getRawMany<{
      id: string;
      title: string;
      startDate: string;
      location: string | null;
      type: string;
      ownerId: string | null;
    }>();

    return rawEvents.map((event) => ({
      ...event,
      derivedType: 'EVENT',
      sortDate: event.startDate,
    }));
  }

  async getUpcomingEvents(churchId: string, personId: string) {
    // 1. Get user's member context for agenda queries
    const memberId = await this.resolveMemberId(churchId, personId);

    // 2. Fetch agenda using the same logic as "Mi Agenda"
    const agenda = await this.agendaService.getUpcomingActivities(
      personId,
      memberId,
      churchId,
      false,
      10, // Fetch more to allow merging with worship services
    );

    // 3. Map agenda items to unified format
    const events = agenda.events.map((e) => {
      let link = '/agenda';
      if (e.type === 'SMALL_GROUP' && e.ownerId) {
        link = `/groups/${e.ownerId}`;
      } else if (e.type === 'MINISTRY' && e.ownerId) {
        link = `/ministries/${e.ownerId}`;
      }
      return {
        id: e.id,
        type: e.type,
        title: e.title,
        date: e.startDate,
        location: e.location,
        link,
      };
    });

    const sessions = agenda.sessions.map((s) => ({
      id: s.id,
      type: 'COUNSELING', // Or SESSION
      title: s.motive || 'Sesión de Acompañamiento',
      date: s.date,
      location: s.location || 'Online / Iglesia',
      link: `/mentorship/process/${s.processId}`,
    }));

    const tasks = agenda.tasks.map((t) => ({
      id: t.id,
      type: 'OTHER', 
      title: `Tarea: ${t.title}`,
      date: t.date,
      location: 'Pendiente',
      link: t.processId ? `/mentorship/process/${t.processId}` : '/agenda',
    }));

    // 4. Get Worship Services
    const worshipServices = await this.worshipRepo.find({
      where: {
        churchId,
        status: ServiceStatus.CONFIRMED,
        date: MoreThanOrEqual(startOfDay(new Date())),
      },
      take: 3,
      order: { date: 'ASC' },
    });

    const mappedWorship = worshipServices.map((s) => ({
      id: s.id,
      type: 'WORSHIP',
      title: s.topic || 'Culto General',
      date: s.date,
      location: 'Auditorio',
      link: `/worship/${s.id}`,
    }));

    // 5. Combine and sort
    const combined = [...mappedWorship, ...events, ...sessions, ...tasks].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    return combined.slice(0, 3);
  }

  async getActiveMentorships(
    churchId: string,
    personId: string,
    memberId?: string,
  ) {
    const resolvedMemberId = memberId || (await this.resolveMemberId(churchId, personId));
    if (!resolvedMemberId) {
      return [];
    }

    const participantRepo = this.mentorshipProcessRepo.manager.getRepository(
      MentorshipProcessParticipant,
    );

    const participations = await participantRepo
      .createQueryBuilder('me')
      .innerJoinAndSelect(
        'me.process',
        'process',
        'process.status = :activeStatus AND process.churchId = :churchId',
        {
          activeStatus: MentorshipStatus.ACTIVE,
          churchId,
        },
      )
      .leftJoinAndSelect('process.participants', 'participant')
      .leftJoinAndSelect('participant.churchPerson', 'churchPerson')
      .leftJoinAndSelect('churchPerson.person', 'person')
      .where('me.churchPersonId = :memberId', { memberId: resolvedMemberId })
      .orderBy('process.startDate', 'DESC')
      .getMany();

    return participations.map((participation) => {
      const process = participation.process;
      const counterPart = process.participants.find(
        (participant) => participant.churchPersonId !== resolvedMemberId,
      );
      const counterPartName = counterPart?.churchPerson?.person
        ? `${counterPart.churchPerson.person.firstName} ${counterPart.churchPerson.person.lastName}`
        : 'Desconocido';

      return {
        id: process.id,
        type: process.type,
        mode: process.mode,
        myRole: participation.role,
        counterPartName,
        startDate: process.startDate,
      };
    });
  }
}
