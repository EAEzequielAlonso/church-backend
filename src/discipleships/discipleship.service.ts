import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Discipleship } from './entities/discipleship.entity';
import { DiscipleshipParticipant } from './entities/discipleship-participant.entity';
import { DiscipleshipMeeting } from './entities/discipleship-meeting.entity';
import { DiscipleshipNote } from './entities/discipleship-note.entity';
import { DiscipleshipTask } from './entities/discipleship-task.entity';
import { ChurchPerson, ChurchPerson as Member } from '../members/entities/church-person.entity';
import { Church } from '../churches/entities/church.entity';
import { CreateDiscipleshipDto, CreateMeetingDto, CreateNoteDto, CreateTaskDto } from './dto/create-discipleship.dto';
import { DiscipleshipStatus, DiscipleshipRole, DiscipleshipNoteType, DiscipleshipTaskStatus, CalendarEventType, SystemRole } from '../common/enums';
import { AppPermission } from '../auth/authorization/permissions.enum';
import { getPermissionsForRoles } from '../auth/authorization/role-permissions.config';
import { CalendarEvent } from '../agenda/entities/calendar-event.entity';

@Injectable()
export class DiscipleshipService {
    constructor(
        @InjectRepository(Discipleship) private discipleshipRep: Repository<Discipleship>,
        @InjectRepository(DiscipleshipParticipant) private participantRep: Repository<DiscipleshipParticipant>,
        @InjectRepository(DiscipleshipMeeting) private meetingRep: Repository<DiscipleshipMeeting>,
        @InjectRepository(DiscipleshipNote) private noteRep: Repository<DiscipleshipNote>,
        @InjectRepository(DiscipleshipTask) private taskRep: Repository<DiscipleshipTask>,
        @InjectRepository(ChurchPerson) private memberRep: Repository<Member>,
        @InjectRepository(Church) private churchRep: Repository<Church>,
        @InjectRepository(CalendarEvent) private eventRep: Repository<CalendarEvent>,
    ) { }

    // --- DISCIPLESHIP PROCESS ---

    async create(createDto: CreateDiscipleshipDto, creatorMemberId: string, creatorRoles: string[]) {
        const creator = await this.memberRep.findOne({
            where: { id: creatorMemberId },
            relations: ['church']
        });
        if (!creator) throw new NotFoundException('Miembro creador no encontrado');
        if (!creator.church) throw new NotFoundException('Iglesia no encontrada');

        const discipleship = this.discipleshipRep.create({
            church: creator.church,
            createdBy: creator,
            name: createDto.name,
            objective: createDto.objective,
            studyMaterial: createDto.studyMaterial,
            status: DiscipleshipStatus.ACTIVE,
            startDate: createDto.startDate ? new Date(createDto.startDate) : new Date(),
        });

        await this.discipleshipRep.save(discipleship);

        // 1. Add Participants from DTO
        if (createDto.participants && createDto.participants.length > 0) {
            for (const p of createDto.participants) {
                const member = await this.memberRep.findOne({ where: { id: p.memberId } });
                if (member) {
                    await this.addParticipant(discipleship.id, member, p.role);
                }
            }
        }

        // 2. Ensure Creator is SUPERVISOR if not already a participant
        const participants = await this.participantRep.find({ where: { discipleship: { id: discipleship.id } }, relations: ['member'] });
        const creatorIsParticipant = participants.some(p => p.member.id === creator.id);

        if (!creatorIsParticipant) {
            await this.addParticipant(discipleship.id, creator, DiscipleshipRole.SUPERVISOR);
        }

        return this.findOne(discipleship.id, creatorMemberId);
    }

    async findAll(memberId: string, roles: string[] = []) {
        const permissions = getPermissionsForRoles(roles);
        const canSupervise = permissions.includes(AppPermission.COUNSELING_VIEW_SUPERVISION);

        const member = await this.memberRep.findOne({ where: { id: memberId }, relations: ['church'] });
        if (!member) return [];

        const myParticipations = await this.participantRep.find({
            where: { member: { id: memberId } },
            relations: ['discipleship']
        });
        const myDiscipleshipIds = myParticipations.map(p => p.discipleship.id);

        const query = this.discipleshipRep.createQueryBuilder('d')
            .leftJoinAndSelect('d.participants', 'p')
            .leftJoinAndSelect('p.member', 'm')
            .leftJoinAndSelect('m.person', 'per')
            .orderBy('d.updatedAt', 'DESC');

        if (canSupervise) {
            query.andWhere(
                '(d.id IN (:...myIds) OR d.church_id = :churchId)',
                {
                    myIds: myDiscipleshipIds.length > 0 ? myDiscipleshipIds : [null],
                    churchId: member.church.id
                }
            );
        } else {
            if (myDiscipleshipIds.length === 0) return [];
            query.andWhere('d.id IN (:...myIds)', { myIds: myDiscipleshipIds });
        }

        return query.getMany();
    }

    async findOne(id: string, memberId: string) {
        const discipleship = await this.discipleshipRep.findOne({
            where: { id },
            relations: [
                'participants',
                'participants.member',
                'participants.member.person',
                'meetings',
                'meetings.tasks',
                'notes',
                'notes.author',
                'notes.author.person',
                'notes.meeting'
            ]
        });

        if (!discipleship) throw new NotFoundException('Discipulado no encontrado');

        const isParticipant = discipleship.participants.some(p => p.member.id === memberId);

        if (!isParticipant) {
            const requester = await this.memberRep.findOne({ where: { id: memberId }, relations: ['church', 'person', 'person.user'] });
            if (requester?.church.id !== discipleship.church.id) {
                throw new ForbiddenException('No tienes acceso a este discipulado');
            }
            if (requester.ecclesiasticalRole !== 'PASTOR' && requester.person?.user?.systemRole !== SystemRole.ADMIN_APP) {
                throw new ForbiddenException('No tienes acceso a este discipulado');
            }
        }

        if (discipleship.notes) {
            discipleship.notes = this.filterNotes(discipleship.notes, memberId, discipleship.participants);
        }

        return discipleship;
    }

    async update(id: string, updateDto: any, memberId: string) {
        const discipleship = await this.discipleshipRep.findOne({ where: { id } });
        if (!discipleship) throw new NotFoundException('Discipulado no encontrado');

        Object.assign(discipleship, updateDto);
        return this.discipleshipRep.save(discipleship);
    }

    async delete(id: string) {
        return this.discipleshipRep.delete(id);
    }

    // --- PARTICIPANTS ---

    async addParticipant(discipleshipId: string, member: Member, role: DiscipleshipRole) {
        const existing = await this.participantRep.findOne({
            where: { discipleship: { id: discipleshipId }, member: { id: member.id } }
        });
        if (existing) return existing;

        const participant = this.participantRep.create({
            discipleship: { id: discipleshipId },
            member,
            role,
            joinedAt: new Date()
        });
        return this.participantRep.save(participant);
    }

    // --- MEETINGS ---

    async createMeeting(discipleshipId: string, dto: CreateMeetingDto, authorId: string) {
        const discipleship = await this.discipleshipRep.findOne({
            where: { id: discipleshipId },
            relations: ['participants', 'participants.member', 'participants.member.person', 'church']
        });
        if (!discipleship) throw new NotFoundException('Discipulado no encontrado');

        const meeting = this.meetingRep.create({
            discipleship,
            date: new Date(dto.date),
            durationMinutes: dto.durationMinutes,
            summary: dto.summary,
            location: dto.location,
            title: dto.title,
            type: dto.type || 'PRESENCIAL',
            color: dto.color || '#6366f1'
        });

        // Create Calendar Event
        const author = await this.memberRep.findOne({ where: { id: authorId }, relations: ['person'] });

        if (author && author.person) {
            const attendees = discipleship.participants
                .map(p => p.member?.person)
                .filter(person => person && person.id !== author.person.id);

            const event = this.eventRep.create({
                title: dto.title || 'Encuentro de Discipulado',
                description: `Encuentro: ${dto.title || 'General'}. ${dto.summary || ''}`,
                startDate: new Date(dto.date),
                endDate: new Date(new Date(dto.date).getTime() + (dto.durationMinutes || 60) * 60000),
                location: dto.location,
                type: CalendarEventType.DISCIPLESHIP,
                color: dto.color || '#6366f1',
                isAllDay: false,
                church: discipleship.church,
                organizer: author.person,
                attendees: attendees
            });
            const savedEvent = await this.eventRep.save(event);
            meeting.calendarEvent = savedEvent;
        }

        await this.meetingRep.save(meeting);

        // Add Note if provided
        if (dto.initialNote) {
            await this.createNote(discipleship.id, {
                content: dto.initialNote.content,
                type: dto.initialNote.type || DiscipleshipNoteType.PRIVATE,
                meetingId: meeting.id
            }, authorId);
        }

        return meeting;
    }

    async updateMeeting(meetingId: string, dto: any) {
        const meeting = await this.meetingRep.findOne({
            where: { id: meetingId },
            relations: ['calendarEvent']
        });
        if (!meeting) throw new NotFoundException('Encuentro no encontrado');

        Object.assign(meeting, dto);

        // Update Calendar Event if exists
        if (meeting.calendarEvent) {
            const event = meeting.calendarEvent;

            // Calculate Start/End
            const start = dto.date ? new Date(dto.date) : event.startDate;
            const duration = dto.durationMinutes || meeting.durationMinutes || 60;

            event.startDate = start;
            event.endDate = new Date(start.getTime() + duration * 60000);

            if (dto.title) event.title = dto.title;
            // Update description based on Title + Summary changes
            const mtgTitle = dto.title || meeting.title || 'Encuentro';
            const mtgSummary = dto.summary || meeting.summary || '';
            event.description = `Encuentro: ${mtgTitle}. ${mtgSummary}`;

            if (dto.location) event.location = dto.location;
            if (dto.color) event.color = dto.color;

            await this.eventRep.save(event);
        }

        return this.meetingRep.save(meeting);
    }

    async deleteMeeting(meetingId: string) {
        const meeting = await this.meetingRep.findOne({
            where: { id: meetingId },
            relations: ['calendarEvent']
        });
        if (!meeting) throw new NotFoundException('Encuentro no encontrado');

        if (meeting.calendarEvent) {
            await this.eventRep.remove(meeting.calendarEvent);
        }

        return this.meetingRep.remove(meeting);
    }

    // --- NOTES ---

    async createNote(discipleshipId: string, dto: CreateNoteDto, authorId: string) {
        const discipleship = await this.discipleshipRep.findOne({ where: { id: discipleshipId } });
        if (!discipleship) throw new NotFoundException('Discipulado no encontrado');

        const author = await this.memberRep.findOne({ where: { id: authorId } });
        if (!author) throw new NotFoundException('Autor no encontrado');

        let meeting: DiscipleshipMeeting | null = null;
        if (dto.meetingId) {
            meeting = await this.meetingRep.findOne({ where: { id: dto.meetingId } });
            if (meeting && meeting.discipleship && (await meeting.discipleship).id !== discipleshipId) {
                // Additional check if needed
            }
        }

        const note = this.noteRep.create({
            discipleship,
            meeting,
            author,
            title: dto.title,
            content: dto.content,
            type: dto.type || DiscipleshipNoteType.PRIVATE
        });

        return this.noteRep.save(note);
    }

    // --- TASKS ---

    async createTask(discipleshipId: string, dto: CreateTaskDto) {
        // Task must be linked to a meeting
        const meeting = await this.meetingRep.findOne({
            where: { id: dto.meetingId },
            relations: ['discipleship']
        });

        if (!meeting) throw new NotFoundException('Encuentro no encontrado');
        if (meeting.discipleship.id !== discipleshipId) {
            throw new BadRequestException('El encuentro no pertenece a este discipulado');
        }

        let assignee: Member | null = null;
        if (dto.assignedToId) {
            assignee = await this.memberRep.findOne({ where: { id: dto.assignedToId } });
        }

        const task = this.taskRep.create({
            meeting,
            assignedTo: assignee,
            title: dto.title,
            description: dto.description,
            dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
            status: DiscipleshipTaskStatus.PENDING
        });

        return this.taskRep.save(task);
    }

    async updateTask(taskId: string, dto: any) {
        const task = await this.taskRep.findOne({ where: { id: taskId } });
        if (!task) throw new NotFoundException('Tarea no encontrada');

        // Simple object assign for now. Permissions might be needed but controller should handle user context if strict.
        // For MVP, we trust the update from controller.

        Object.assign(task, dto);
        return this.taskRep.save(task);
    }


    // --- HELPERS ---

    private filterNotes(notes: DiscipleshipNote[], viewerId: string, participants: DiscipleshipParticipant[]): DiscipleshipNote[] {
        if (!notes) return [];
        const viewerParticipant = participants.find(p => p.member.id === viewerId);
        const viewerRole = viewerParticipant?.role;
        const isSupervisor = viewerRole === DiscipleshipRole.SUPERVISOR;
        const isDiscipler = viewerRole === DiscipleshipRole.DISCIPLER;

        return notes.filter(note => {
            if (note.author.id === viewerId) return true;
            if (note.type === DiscipleshipNoteType.PRIVATE) return false;
            if (note.type === DiscipleshipNoteType.SHARED) return true;
            if (note.type === DiscipleshipNoteType.SUPERVISION) {
                return isSupervisor || isDiscipler;
            }
            return false;
        });
    }
}
