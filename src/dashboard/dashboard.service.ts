import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChurchPerson } from '../members/entities/church-person.entity';
import { Group } from '../groups/entities/group.entity';
import { MembershipStatus } from '../members/enums/membership-status.enum';
import {
  WorshipService,
  ServiceStatus,
} from '../worship/entities/worship-service.entity';
import { CalendarEvent } from '../agenda/entities/calendar-event.entity';
import { Repository, MoreThan, In } from 'typeorm';
import * as dateFns from 'date-fns';
import { MinistryMember } from '../ministries/entities/ministry-member.entity';
import { GroupParticipant } from '../groups/entities/group-participant.entity';
import { MentorshipProcess } from '../mentorship/entities/mentorship-process.entity';
import { MentorshipStatus } from '../mentorship/enums/mentorship.enum';
import { MentorshipProcessParticipant } from '../mentorship/entities/mentorship-process-participant.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(ChurchPerson)
    private memberRepository: Repository<ChurchPerson>,
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
  ) { }

  async getStats(churchId: string) {
    const membersData = await this.memberRepository
      .createQueryBuilder('cp')
      .select('cp.membershipStatus', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('cp.churchId = :churchId', { churchId })
      .groupBy('cp.membershipStatus')
      .getRawMany();

    let visitors = 0,
      members = 0,
      invited = 0,
      prospects = 0,
      total = 0;
    membersData.forEach((row) => {
      const cnt = parseInt(row.count, 10);
      total += cnt;
      if (row.status === MembershipStatus.VISITOR) visitors = cnt;
      else if (row.status === MembershipStatus.MEMBER) members = cnt;
      else if (row.status === MembershipStatus.INVITED) invited = cnt;
      else if (row.status === MembershipStatus.PROSPECT) prospects = cnt;
    });

    // Active Groups
    const totalGroups = await this.groupRepository.count({
      where: { churchId: churchId },
    });

    return {
      members: {
        total,
        visitors,
        invited,
        prospects,
        members,
      },
      groups: {
        total: totalGroups,
        active: totalGroups,
      },
    };
  }

  async getUpcomingEvents(churchId: string, personId: string) {
    // 1. Get Confirmed Worship Services (Future)
    const services = await this.worshipRepo.find({
      where: {
        churchId: churchId,
        status: ServiceStatus.CONFIRMED,
        date: MoreThan(new Date()),
      },
      take: 3,
      order: { date: 'ASC' },
    });

    // 2. Resolve user's ministries and groups
    const myMinistries = await this.ministryMemberRepo.find({
      where: { member: { personId, churchId } },
      relations: ['ministry'],
    });
    const myGroups = await this.groupParticipantRepo.find({
      where: { churchPerson: { personId, churchId } },
      relations: ['group'],
    });

    const ownerIds = [
      churchId,
      personId,
      ...myMinistries.map((m) => m.ministry.id),
      ...myGroups.map((g) => g.group.id),
    ];

    // 3. Get Calendar Events (Future) relevant to the user
    const events = await this.eventRepo.find({
      where: {
        ownerId: In(ownerIds),
        startDate: MoreThan(new Date()),
      },
      take: 10,
      order: { startDate: 'ASC' },
    });

    const combined = [
      ...services.map((s) => ({
        id: s.id,
        type: 'WORSHIP',
        title: s.topic || 'Culto General',
        date: s.date,
        location: 'Auditorio',
        link: `/worship/${s.id}`,
      })),
      ...events.map((event) => {
        let link = '/agenda';
        if (event.type === 'SMALL_GROUP' && event.ownerId) {
          link = `/groups/${event.ownerId}`;
        } else if (event.type === 'MINISTRY' && event.ownerId) {
          link = `/ministries/${event.ownerId}`;
        }

        return {
          id: event.id,
          type: event.type,
          title: event.title,
          date: event.startDate,
          location: event.location,
          link,
        };
      }),
    ];

    combined.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    return combined.slice(0, 3);
  }

  async getActiveMentorships(churchId: string, personId: string) {
    const participantRepo = this.mentorshipProcessRepo.manager.getRepository(
      MentorshipProcessParticipant,
    );
    const matchingParticipants = await participantRepo.find({
      where: {
        churchPerson: { personId, churchId },
        process: { status: MentorshipStatus.ACTIVE },
      },
      relations: ['process'],
    });

    const processIds = matchingParticipants.map((p) => p.process.id);
    if (processIds.length === 0) return [];

    const processes = await this.mentorshipProcessRepo.find({
      where: { id: In(processIds) },
      relations: [
        'participants',
        'participants.churchPerson',
        'participants.churchPerson.person',
      ],
    });

    return processes.map((process) => {
      const myParticipation = process.participants.find(
        (p) => p.churchPerson.personId === personId,
      );
      const counterPart = process.participants.find(
        (p) => p.churchPerson.personId !== personId,
      );

      return {
        id: process.id,
        type: process.type,
        mode: process.mode,
        myRole: myParticipation?.role,
        counterPartName: counterPart
          ? `${counterPart.churchPerson.person.firstName} ${counterPart.churchPerson.person.lastName}`
          : 'Desconocido',
        startDate: process.startDate,
      };
    });
  }
}
