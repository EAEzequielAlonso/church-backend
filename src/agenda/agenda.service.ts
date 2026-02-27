import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, In, Brackets } from 'typeorm';
import { CareSession } from '../counseling/entities/care-session.entity';
import { CareTask } from '../counseling/entities/care-task.entity';
import { CareTaskStatus, CareSessionStatus, CalendarEventType, MinistryRole, EcclesiasticalRole } from '../common/enums';
import { CalendarEvent } from './entities/calendar-event.entity';
import { ChurchPerson } from '../members/entities/church-person.entity';
import { Person } from '../users/entities/person.entity';
import { Ministry } from '../ministries/entities/ministry.entity';
import { Group } from '../groups/entities/group.entity';
import { GroupParticipant } from '../groups/entities/group-participant.entity';
import { GroupRole, GroupType } from '../groups/enums/group.enums';
import { MinistryRoleAssignment } from '../ministries/entities/ministry-role-assignment.entity';
import { FollowUp } from '../follow-ups/entities/follow-up.entity';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';

@Injectable()
export class AgendaService {
    constructor(
        @InjectRepository(CareSession)
        private readonly sessionRepository: Repository<CareSession>,
        @InjectRepository(CareTask)
        private readonly taskRepository: Repository<CareTask>,
        @InjectRepository(CalendarEvent)
        private readonly eventRepository: Repository<CalendarEvent>,
        @InjectRepository(ChurchPerson)
        private readonly memberRepository: Repository<ChurchPerson>,
        @InjectRepository(Person)
        private readonly personRepository: Repository<Person>,
        @InjectRepository(Ministry)
        private readonly ministryRepository: Repository<Ministry>,
        @InjectRepository(GroupParticipant)
        private readonly groupParticipantRepository: Repository<GroupParticipant>,
        @InjectRepository(Group)
        private readonly groupRepository: Repository<Group>,
        @InjectRepository(MinistryRoleAssignment)
        private readonly assignmentRepository: Repository<MinistryRoleAssignment>,
        @InjectRepository(FollowUp)
        private readonly followUpRepository: Repository<FollowUp>,
    ) { }

    async getUpcomingActivities(personId: string, memberId?: string, churchId?: string) {
        try {
            // console.log('Fetching agenda for personId:', personId);

            // 1. Get Upcoming Sessions (where I am a counselor or counselee)
            const sessionsQuery = this.sessionRepository.createQueryBuilder('session')
                .leftJoinAndSelect('session.process', 'process')
                .leftJoinAndSelect('process.participants', 'participant')
                .leftJoinAndSelect('participant.member', 'member')
                .leftJoinAndSelect('member.person', 'person')
                .where('person.id = :personId', { personId })
                .andWhere('session.date >= :today', { today: new Date() })
                .andWhere('session.status != :cancelled', { cancelled: CareSessionStatus.CANCELED })
                .orderBy('session.date', 'ASC');

            const sessions = await sessionsQuery.getMany();

            // 2. Get Pending Tasks
            const tasksQuery = this.taskRepository.createQueryBuilder('task')
                .leftJoinAndSelect('task.session', 'session')
                .leftJoinAndSelect('session.process', 'process')
                .leftJoinAndSelect('process.participants', 'participant')
                .leftJoinAndSelect('participant.member', 'member')
                .leftJoinAndSelect('member.person', 'person')
                .where('person.id = :personId', { personId })
                .andWhere('participant.role = :counselee', { counselee: 'COUNSELEE' })
                .andWhere('task.status = :pending', { pending: CareTaskStatus.PENDING });

            const tasks = await tasksQuery.getMany();

            // 3. Get Calendar Events (Generic)
            // Rules:
            // - PERSONAL: organizer.id === personId
            // - CHURCH: church.id === churchId
            // - MINISTRY: ministry IN (myMinistries)
            // - ATTENDEE: attendees.id === personId (Explicit assignment)

            // First, find my ministry IDs if memberId exists
            let ministryIds: string[] = [];
            if (memberId) {
                const member = await this.memberRepository.findOne({
                    where: { id: memberId },
                    relations: ['ministries', 'ministries.ministry']
                });
                if (member && member.ministries) {
                    ministryIds = member.ministries.map(mm => mm.ministry.id);
                }
            }

            // Find my Group IDs (formerly SmallGroupIds)
            let groupIds: string[] = [];
            if (memberId) { // User is linked to ChurchPerson
                const memberships = await this.groupParticipantRepository.find({
                    where: { churchPerson: { id: memberId } },
                    relations: ['group']
                });
                groupIds = memberships.map(m => m.group.id);
            }

            const eventsQuery = this.eventRepository.createQueryBuilder('event')
                .leftJoinAndSelect('event.group', 'group')
                .leftJoinAndSelect('event.discipleshipMeeting', 'dm')
                .leftJoinAndSelect('dm.discipleship', 'discipleship')
                .leftJoin('event.church', 'church')
                .leftJoin('event.organizer', 'organizer')
                .leftJoin('event.ministry', 'ministry')
                .leftJoin('event.attendees', 'attendee')
                .where('event.startDate >= :today', { today: new Date() })
                .andWhere(
                    new Brackets(qb => {
                        qb.where('(event.type = :churchType AND church.id = :churchId)', { churchType: 'CHURCH', churchId })
                            .orWhere('(organizer.id = :personId)', { personId })
                            .orWhere('(event.type = :ministryType AND ministry.id IN (:...ministryIds))', {
                                ministryType: 'MINISTRY',
                                ministryIds: ministryIds.length > 0 ? ministryIds : ['00000000-0000-0000-0000-000000000000']
                            })
                            .orWhere('(event.type = :groupType AND group.id IN (:...groupIds))', {
                                groupType: 'SMALL_GROUP',
                                groupIds: groupIds.length > 0 ? groupIds : ['00000000-0000-0000-0000-000000000000']
                            })
                            .orWhere('(event.type = :discipleshipType AND (organizer.id = :personId OR attendee.id = :personId))', {
                                discipleshipType: 'DISCIPLESHIP',
                                personId
                            })
                            .orWhere('(attendee.id = :personId)', { personId });
                    })
                )
                .orderBy('event.startDate', 'ASC');

            const events = await eventsQuery.getMany();

            // 4. Get Ministry Assignments
            // Query for assignments starting today or future
            const todayStr = new Date().toISOString().split('T')[0];
            const assignments = await this.assignmentRepository.createQueryBuilder('assignment')
                .leftJoinAndSelect('assignment.role', 'role')
                .leftJoinAndSelect('assignment.ministry', 'ministry')
                .leftJoinAndSelect('assignment.person', 'person')
                .where('person.id = :personId', { personId })
                .andWhere('assignment.date >= :todayStr', { todayStr })
                .orderBy('assignment.date', 'ASC')
                .getMany();

            // Transform assignments to Events
            const assignmentEvents = assignments.map(a => {
                // Approximate start time or use value from service if linked
                const eventDate = new Date(a.date);
                // Adjust to noon to avoid timezone shift issues causing day change if using UTC
                // Or just keep strictly string based on client
                // For now, let's set it to 09:00 local representation
                // But date is string YYYY-MM-DD.
                // const dateObj = new Date(a.date + 'T09:00:00'); 

                return {
                    id: a.id,
                    title: `Servicio: ${a.role.name}`,
                    description: `Asignación en ${a.ministry.name}`,
                    startDate: new Date(a.date + 'T00:00:00'),
                    endDate: new Date(a.date + 'T23:59:59'),
                    location: 'Iglesia',
                    type: 'MINISTRY', // mimic ministry event
                    color: '#8b5cf6', // Violet
                    isAllDay: true,
                    ministry: { id: a.ministry.id, name: a.ministry.name },
                    smallGroup: null,
                    discipleship: null,
                    isAssignment: true // Flag mostly for frontend if needed
                };
            });

            // Merge events and sort
            const allEvents = [...events.map(e => ({
                id: e.id,
                title: e.title,
                description: e.description,
                startDate: e.startDate,
                endDate: e.endDate,
                location: e.location,
                type: e.type,
                color: e.color,
                isAllDay: e.isAllDay,
                ministry: e.ministry ? { id: e.ministry.id, name: e.ministry.name } : null,
                group: e.group ? { id: e.group.id, name: e.group.name } : null,
                discipleship: e.discipleshipMeeting?.discipleship ? {
                    id: e.discipleshipMeeting.discipleship.id,
                    name: e.discipleshipMeeting.discipleship.name
                } : null
            })),
            ...assignmentEvents
            ].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());


            return {
                sessions: sessions.map(s => ({
                    id: s.id,
                    date: s.date,
                    topics: s.topics,
                    location: s.location,
                    processId: s.process?.id,
                    motive: s.process?.motive,
                    type: 'SESSION'
                })),
                tasks: tasks.map(t => ({
                    id: t.id,
                    title: t.title,
                    description: t.description,
                    date: t.session?.date,
                    processId: t.session?.process?.id,
                    type: 'TASK'
                })),
                events: allEvents
            };
        } catch (error) {
            console.error('Error in AgendaService:', error);
            throw error;
        }
    }

    async createEvent(
        createDto: CreateCalendarEventDto,
        personId: string,
        churchId: string,
        permissions: string[], // AppPermission[]
        roles: string[],
        memberId?: string
    ) {
        const {
            title, description, startDate, endDate, location,
            type, color, isAllDay, ministryId, attendeeIds
        } = createDto;

        const event = this.eventRepository.create({
            title,
            description,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            location,
            type,
            color,
            isAllDay: isAllDay || false,
            church: { id: churchId }
        });

        // Always assign organizer (User who created the event)
        event.organizer = await this.personRepository.findOne({ where: { id: personId } });

        // Permission Logic
        if (type === CalendarEventType.PERSONAL) {
            // Already assigned above
        } else if (type === CalendarEventType.CHURCH) {
            // Check Capability
            if (!permissions.includes('AGENDA_CREATE_CHURCH') && !roles.includes('ADMIN_CHURCH')) {
                throw new ForbiddenException('No tienes permiso para crear eventos de iglesia');
            }
        } else if (type === CalendarEventType.MINISTRY) {
            if (!ministryId) throw new ForbiddenException('Ministry ID required');

            // Check Capability
            if (!permissions.includes('AGENDA_CREATE_MINISTRY') && !roles.includes('ADMIN_CHURCH')) {
                throw new ForbiddenException('No tienes permiso para gestionar eventos de ministerio');
            }

            const ministry = await this.ministryRepository.findOne({
                where: { id: ministryId },
                relations: ['members', 'members.member']
            });
            if (!ministry) throw new NotFoundException('Ministry not found');

            event.ministry = ministry;

            // Scope Request: Are you the leader of THIS ministry? (Or a global admin/pastor?)
            // If you have CHURCH_MANAGE or AGENDA_CREATE_CHURCH, you likely can override.
            // But let's verify specific ministry leadership for standard leaders.

            const hasGlobalOverride = permissions.includes('AGENDA_CREATE_CHURCH') || roles.includes('ADMIN_CHURCH') || roles.includes('AUDITOR');

            if (!hasGlobalOverride) {
                // Check if leader of this specific ministry
                let isLeader = false;
                if (memberId) {
                    const membership = ministry.members.find(mm => mm.member.id === memberId);
                    if (membership && membership.roleInMinistry === MinistryRole.LEADER) {
                        isLeader = true;
                    }
                }

                if (!isLeader) {
                    throw new ForbiddenException('No eres líder de este ministerio específico');
                }
            }
        } else if (type === CalendarEventType.SMALL_GROUP) {
            if (!createDto.groupId) throw new ForbiddenException('Group ID required');

            const group = await this.groupRepository.findOne({
                where: { id: createDto.groupId },
                relations: ['participants', 'participants.churchPerson', 'participants.churchPerson.person']
            });

            if (!group) throw new NotFoundException('Grupo no encontrado');
            event.group = group;

            // Permission Check: Must be LEADER of the group
            let isModerator = false;
            // Global override? Maybe CHURCH_MANAGE
            const hasGlobalOverride = permissions.includes('AGENDA_CREATE_CHURCH') || roles.includes('ADMIN_CHURCH') || roles.includes('AUDITOR');

            if (!hasGlobalOverride) {
                if (memberId) {
                    const membership = group.participants.find(m => m.churchPerson.id === memberId);

                    if (membership && membership.role === GroupRole.LEADER) {
                        isModerator = true;
                    }
                }

                if (!isModerator) {
                    throw new ForbiddenException('No eres líder de este grupo');
                }
            }
        }

        // Attendees
        if (attendeeIds && attendeeIds.length > 0) {
            const attendees = await this.personRepository.findBy({ id: In(attendeeIds) });
            event.attendees = attendees;
        }

        return this.eventRepository.save(event);
    }

    async markAttendance(eventId: string, personIds: string[]) {
        const event = await this.eventRepository.findOne({
            where: { id: eventId },
            relations: ['attendees']
        });

        if (!event) throw new NotFoundException('Evento no encontrado');

        const attendeesMap = new Map<string, Person>();

        for (const id of personIds) {
            // 1. Try to find directly as Person
            let person = await this.personRepository.findOne({ where: { id } });

            if (!person) {
                // fallback to ChurchPerson search directly
                const cp = await this.memberRepository.findOne({ where: { id }, relations: ['person'] });
                if (cp && cp.person) {
                    person = cp.person;
                }
            }

            if (person) {
                attendeesMap.set(person.id, person);
            }
        }

        event.attendees = Array.from(attendeesMap.values());
        return this.eventRepository.save(event);
    }
    async updateEvent(id: string, updateDto: any, personId: string, roles: string[]) {
        const event = await this.eventRepository.findOne({
            where: { id },
            relations: ['organizer', 'smallGroup', 'ministry', 'attendees']
        });

        if (!event) throw new NotFoundException('Evento no encontrado');

        // Basic permission check: Admin or Organizer
        const isAdmin = roles.includes('ADMIN_CHURCH') || roles.includes('AUDITOR');
        const isOrganizer = event.organizer?.id === personId;

        // Moderator Check
        let isModerator = false;
        if (event.type === CalendarEventType.SMALL_GROUP && event.group) {
            const membership = await this.groupParticipantRepository.findOne({
                where: {
                    group: { id: event.group.id },
                    churchPerson: { id: personId }
                }
            });
            if (membership && membership.role === GroupRole.LEADER) {
                isModerator = true;
            }
        }

        if (!isAdmin && !isOrganizer && !isModerator) {
            throw new ForbiddenException('No tienes permiso para editar este evento');
        }

        // Map fields
        if (updateDto.title) event.title = updateDto.title;
        if (updateDto.description !== undefined) event.description = updateDto.description;
        if (updateDto.location !== undefined) event.location = updateDto.location;
        if (updateDto.startDate) event.startDate = new Date(updateDto.startDate);
        if (updateDto.endDate) event.endDate = new Date(updateDto.endDate);
        if (updateDto.color) event.color = updateDto.color;
        if (updateDto.isAllDay !== undefined) event.isAllDay = updateDto.isAllDay;

        return this.eventRepository.save(event);
    }

    async deleteEvent(id: string, personId: string, roles: string[]) {
        const event = await this.eventRepository.findOne({
            where: { id },
            relations: ['organizer', 'smallGroup']
        });

        if (!event) throw new NotFoundException('Evento no encontrado');

        const isAdmin = roles.includes('ADMIN_CHURCH') || roles.includes('AUDITOR');
        const isOrganizer = event.organizer?.id === personId;

        let isModerator = false;
        if (event.type === CalendarEventType.SMALL_GROUP && event.group) {
            const membership = await this.groupParticipantRepository.findOne({
                where: {
                    group: { id: event.group.id },
                    churchPerson: { id: personId }
                }
            });
            if (membership && membership.role === GroupRole.LEADER) {
                isModerator = true;
            }
        }

        if (!isAdmin && !isOrganizer && !isModerator) {
            throw new ForbiddenException('No tienes permiso para eliminar este evento');
        }

        return this.eventRepository.remove(event);
    }
}
