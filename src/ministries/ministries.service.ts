import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Ministry } from './entities/ministry.entity';
import { MinistryMember } from './entities/ministry-member.entity';
import { MinistryTask } from './entities/ministry-task.entity';
import { MeetingNote } from './entities/meeting-note.entity';
import { CalendarEvent } from '../agenda/entities/calendar-event.entity';
import { ChurchPerson } from '../members/entities/church-person.entity';
import {
  MinistryRole,
  MinistryEventType,
  CalendarEventType,
} from '../common/enums';
import { Person } from '../users/entities/person.entity';

import { ServiceDuty } from './entities/service-duty.entity';
import { MinistryRoleAssignment } from './entities/ministry-role-assignment.entity';
import { CreateMinistryDto } from './dto/create-ministry.dto';

@Injectable()
export class MinistriesService {
  constructor(
    @InjectRepository(Ministry) private ministryRepo: Repository<Ministry>,
    @InjectRepository(MinistryMember)
    private memberRepo: Repository<MinistryMember>,
    @InjectRepository(MinistryTask) private taskRepo: Repository<MinistryTask>,
    @InjectRepository(MeetingNote) private noteRepo: Repository<MeetingNote>,
    @InjectRepository(CalendarEvent)
    private eventRepo: Repository<CalendarEvent>,
    @InjectRepository(ChurchPerson)
    private ChurchPersonRepo: Repository<ChurchPerson>,
    @InjectRepository(ServiceDuty)
    private serviceDutyRepo: Repository<ServiceDuty>,
    @InjectRepository(MinistryRoleAssignment)
    private assignmentRepo: Repository<MinistryRoleAssignment>,
  ) {}

  async findAll(churchId: string) {
    return this.ministryRepo.find({
      where: { church: { id: churchId } },
      relations: [
        'leader',
        'leader.person',
        'members',
        'members.member.person',
      ],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string) {
    const ministry = await this.ministryRepo.findOne({
      where: { id },
      relations: [
        'leader',
        'leader.person',
        'members',
        'members.member.person',
        'tasks',
        'tasks.assignedTo.person',
        'serviceDuties',
      ],
    });
    if (!ministry) throw new NotFoundException('Ministerio no encontrado');

    // Dynamically populate events using the new polymorphic model
    const events = await this.eventRepo.find({
      where: { type: CalendarEventType.MINISTRY, ownerId: id },
      relations: ['meetingNote'],
      order: { startDate: 'ASC' },
    });

    return { ...ministry, calendarEvents: events };
  }

  async create(churchId: string, data: CreateMinistryDto) {
    const ministry = this.ministryRepo.create({
      name: data.name,
      description: data.description,
      color: data.color || '#3b82f6',
      status: 'active',
      church: { id: churchId },
    });

    if (data.leaderId) {
      const leader = await this.ChurchPersonRepo.findOne({
        where: { id: data.leaderId },
      });
      if (leader) {
        ministry.leader = leader;
      }
    }

    const savedMinistry = await this.ministryRepo.save(ministry);

    // If a leader was assigned, add them also as a member with LEADER role
    if (savedMinistry.leader) {
      await this.addMember(
        savedMinistry.id,
        savedMinistry.leader.id,
        MinistryRole.LEADER,
      );
    }

    return savedMinistry;
  }

  async update(id: string, data: Partial<Ministry> & { leaderId?: string }) {
    const ministry = await this.findOne(id);

    if (data.leaderId) {
      const leader = await this.ChurchPersonRepo.findOne({
        where: { id: data.leaderId },
      });
      if (leader) {
        ministry.leader = leader;
        // Auto-add leader as a member
        await this.addMember(ministry.id, leader.id, MinistryRole.LEADER);
      }
      delete data.leaderId;
    }

    Object.assign(ministry, data);
    return this.ministryRepo.save(ministry);
  }

  // --- MEMBERS ---

  async addMember(ministryId: string, memberId: string, role: MinistryRole) {
    const ministry = await this.findOne(ministryId);
    const ChurchPerson = await this.ChurchPersonRepo.findOne({
      where: { id: memberId },
    });
    if (!ChurchPerson)
      throw new NotFoundException('Miembro de iglesia no encontrado');

    const existing = await this.memberRepo.findOne({
      where: { ministry: { id: ministryId }, member: { id: memberId } },
    });

    if (existing) {
      existing.status = 'active';
      existing.roleInMinistry = role;
      return this.memberRepo.save(existing);
    }

    const member = this.memberRepo.create({
      ministry,
      member: ChurchPerson,
      roleInMinistry: role,
      status: 'active',
    });

    return this.memberRepo.save(member);
  }

  async removeMember(ministryId: string, memberId: string) {
    const member = await this.memberRepo.findOne({
      where: { ministry: { id: ministryId }, member: { id: memberId } },
    });
    if (!member)
      throw new NotFoundException('Miembro no encontrado en este ministerio');

    member.status = 'inactive';
    return this.memberRepo.save(member);
  }

  // --- EVENTS (AGENDA INTEGRATION) ---

  async getEvents(ministryId: string) {
    const events = await this.eventRepo.find({
      where: { type: CalendarEventType.MINISTRY, ownerId: ministryId },
      order: { startDate: 'ASC' },
    });
    console.log(
      `[DEBUG] getEvents for ministry ${ministryId}: found ${events.length} events`,
    );
    return events;
  }

  async createEvent(
    ministryId: string,
    personId: string,
    churchId: string,
    data: any,
  ) {
    const ministry = await this.findOne(ministryId);

    const subType =
      data.type && data.type !== CalendarEventType.MINISTRY
        ? `[${data.type}] `
        : '';
    const description = subType + (data.description || '');

    const event = this.eventRepo.create({
      ...data,
      description,
      type: CalendarEventType.MINISTRY,
      ownerId: ministry.id,
      organizer: { id: personId } as Person,
    });

    return this.eventRepo.save(event);
  }

  // --- TASKS ---

  async getTasks(ministryId: string) {
    return this.taskRepo.find({
      where: { ministry: { id: ministryId } },
      relations: ['assignedTo', 'assignedTo.person'],
      order: { dueDate: 'ASC' },
    });
  }

  async createTask(ministryId: string, data: any) {
    const ministry = await this.findOne(ministryId);
    const task = this.taskRepo.create({
      ...data,
      ministry,
    });
    return this.taskRepo.save(task);
  }

  async updateTask(taskId: string, data: any) {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Tarea no encontrada');
    Object.assign(task, data);
    return this.taskRepo.save(task);
  }

  async deleteTask(ministryId: string, taskId: string) {
    const task = await this.taskRepo.findOne({
      where: { id: taskId, ministry: { id: ministryId } },
    });
    if (!task) throw new NotFoundException('Tarea no encontrada');
    return this.taskRepo.remove(task);
  }

  // --- MEETING NOTES ---

  async getNote(eventId: string) {
    return this.noteRepo.findOne({
      where: { event: { id: eventId } },
      relations: ['createdBy'],
    });
  }

  async createOrUpdateNote(eventId: string, personId: string, data: any) {
    let note = await this.noteRepo.findOne({
      where: { event: { id: eventId } },
    });

    if (!note) {
      note = this.noteRepo.create({
        event: { id: eventId } as CalendarEvent,
        createdBy: { id: personId } as Person,
      });
    }

    Object.assign(note, data);
    return this.noteRepo.save(note);
  }

  // --- SERVICE DUTIES CONFIGURATION ---

  async getServiceDuties(ministryId: string) {
    return this.serviceDutyRepo.find({
      where: { ministry: { id: ministryId } },
      order: { name: 'ASC' },
    });
  }

  async getAllServiceDuties(churchId: string) {
    return this.serviceDutyRepo.find({
      where: { ministry: { church: { id: churchId } } },
      relations: ['ministry'],
      order: { name: 'ASC' },
    });
  }

  async createServiceDuty(
    ministryId: string,
    name: string,
    behaviorType?: any,
  ) {
    const ministry = await this.findOne(ministryId);
    const duty = this.serviceDutyRepo.create({
      name,
      behaviorType: behaviorType || 'STANDARD',
      ministry,
    });
    return this.serviceDutyRepo.save(duty);
  }

  async deleteServiceDuty(ministryId: string, dutyId: string) {
    const duty = await this.serviceDutyRepo.findOne({
      where: { id: dutyId, ministry: { id: ministryId } },
    });
    if (!duty) throw new NotFoundException('Tarea de culto no encontrada');
    return this.serviceDutyRepo.remove(duty);
  }

  // --- MEMBER MANAGEMENT --

  async updateMemberRole(
    ministryId: string,
    memberId: string,
    role: MinistryRole,
  ) {
    const member = await this.memberRepo.findOne({
      where: { ministry: { id: ministryId }, member: { id: memberId } }, // memberId is ChurchPersonId
    });

    // Try finding by internal id if above fails
    if (!member) {
      const memberByInternalId = await this.memberRepo.findOne({
        where: { id: memberId, ministry: { id: ministryId } },
      });
      if (!memberByInternalId)
        throw new NotFoundException('Miembro no encontrado en este ministerio');

      memberByInternalId.roleInMinistry = role;
      return this.memberRepo.save(memberByInternalId);
    }

    member.roleInMinistry = role;
    return this.memberRepo.save(member);
  }

  // --- SCHEDULE & ASSIGNMENTS ---

  async getAssignments(ministryId: string, fromDate?: string, toDate?: string) {
    const query = this.assignmentRepo
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.role', 'role')
      .leftJoinAndSelect('assignment.person', 'person') // Generic User/Person
      .where('assignment.ministryId = :ministryId', { ministryId });

    if (fromDate) {
      query.andWhere('assignment.date >= :fromDate', { fromDate });
    }
    if (toDate) {
      query.andWhere('assignment.date <= :toDate', { toDate });
    }

    return query
      .orderBy('assignment.date', 'ASC')
      .addOrderBy('role.name', 'ASC')
      .getMany();
  }

  async createAssignments(ministryId: string, assignments: any[]) {
    const ministry = await this.findOne(ministryId);
    const created: MinistryRoleAssignment[] = [];

    for (const dto of assignments) {
      const role = await this.serviceDutyRepo.findOne({
        where: { id: dto.roleId },
      });
      if (!role) continue;

      const existing = await this.assignmentRepo.findOne({
        where: {
          ministry: { id: ministryId },
          role: { id: dto.roleId },
          date: dto.date,
        },
      });

      if (existing) {
        existing.person = { id: dto.personId } as Person;
        existing.metadata = dto.metadata || null;
        // If serviceType needs update, do it too
        if (dto.serviceType) existing.serviceType = dto.serviceType;
        created.push(await this.assignmentRepo.save(existing));
      } else {
        const assignment = this.assignmentRepo.create({
          ministry,
          role,
          person: { id: dto.personId } as Person,
          date: dto.date,
          serviceType: dto.serviceType,
          metadata: dto.metadata || null,
        });
        created.push(await this.assignmentRepo.save(assignment));
      }
    }
    return created;
  }

  async deleteAssignment(ministryId: string, assignmentId: string) {
    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId, ministry: { id: ministryId } },
    });
    if (!assignment) throw new NotFoundException('Asignación no encontrada');
    return this.assignmentRepo.remove(assignment);
  }
}
