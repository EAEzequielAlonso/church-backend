import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CareProcess } from './entities/care-process.entity';
import { CareParticipant } from './entities/care-participant.entity';
import { CareNote } from './entities/care-note.entity';
import { ChurchPerson as Member } from '../members/entities/church-person.entity';
import { Church } from '../churches/entities/church.entity';
import { CareProcessType, CareProcessStatus, CareParticipantRole, CareNoteVisibility, CareSessionStatus, CareTaskStatus, SystemRole, FunctionalRole } from '../common/enums';
import { AppPermission } from '../auth/authorization/permissions.enum';
import { getPermissionsForRoles } from '../auth/authorization/role-permissions.config';
import { CareSession } from './entities/care-session.entity';
import { CareTask } from './entities/care-task.entity';
import { MembersService } from '../members/members.service'; // Assuming this import is needed for MembersService

@Injectable()
export class CounselingService {
    constructor(
        @InjectRepository(CareProcess) private processRep: Repository<CareProcess>,
        @InjectRepository(CareParticipant) private participantRep: Repository<CareParticipant>,
        @InjectRepository(CareNote) private noteRep: Repository<CareNote>,
        @InjectRepository(CareSession) private readonly sessionRepository: Repository<CareSession>,
        @InjectRepository(CareTask) private readonly taskRepository: Repository<CareTask>,
        private readonly membersService: MembersService,
        @InjectRepository(Member) private memberRep: Repository<Member>,
        @InjectRepository(Church) private churchRep: Repository<Church>,
    ) { }

    // --- PROCESS MANAGEMENT ---

    async createProcess(
        churchId: string,
        counselorMemberId: string,
        counselorPersonId: string,
        counselorRoles: string[],
        type: CareProcessType,
        counseleeMemberId?: string,
        motive?: string
    ) {
        const church = await this.churchRep.findOne({ where: { id: churchId } });
        if (!church) throw new NotFoundException('Iglesia no encontrada');

        const counselor = await this.memberRep.findOne({
            where: { id: counselorMemberId, church: { id: churchId } },
            relations: ['person', 'person.user'] // Removed 'roles' as it is not a relation on ChurchPerson
        });
        if (!counselor) throw new NotFoundException('Consejero no encontrado');

        // Logic check: Only authorized counselors (or admins) can create FORMAL processes
        if (type === CareProcessType.FORMAL) {
            const isPlatformAdmin = counselor.person?.user?.systemRole === SystemRole.ADMIN_APP || false;
            // Check if user is Church Admin (Role name 'ADMIN') or Pastor
            const isChurchAdmin = counselor.ecclesiasticalRole === 'PASTOR'; // Using string or Enum logic
            const isAuthorized = counselor.functionalRoles?.includes(FunctionalRole.COUNSELOR) || isPlatformAdmin || isChurchAdmin;

            if (!isAuthorized) {
                throw new ForbiddenException('No tienes autorización para iniciar un acompañamiento formal. Por favor contacta al administrador.');
            }
        }

        if (type === CareProcessType.INFORMAL && counseleeMemberId) {
            // INFORMAL can have a target person described in motive/notes, but usually it's unilateral. 
        }

        const process = this.processRep.create({
            church,
            type,
            status: type === CareProcessType.FORMAL ? CareProcessStatus.DRAFT : CareProcessStatus.ACTIVE, // Formal starts as Draft/Pending
            motive,
            startDate: new Date(),
        });

        await this.processRep.save(process);

        // Add Counselor
        await this.addParticipant(process.id, counselor, CareParticipantRole.COUNSELOR, true);

        // Add Counselee if provided
        if (counseleeMemberId) {
            const counselee = await this.memberRep.findOne({ where: { id: counseleeMemberId, church: { id: churchId } } });
            if (counselee) {
                // For FORMAL, accepted=false initially (PENDING_ACCEPTANCE logic handles update)
                // For INFORMAL, we might link them for record keeping but they never "accept".
                // We'll set accepted=false by default in entity.
                const accepted = false;
                await this.addParticipant(process.id, counselee, CareParticipantRole.COUNSELEE, accepted);
            }
        }

        if (type === CareProcessType.FORMAL) {
            process.status = CareProcessStatus.PENDING_ACCEPTANCE;
            await this.processRep.save(process);
        }

        return this.findOne(process.id, counselorMemberId, counselorPersonId, counselorRoles);
    }

    async findAll(memberId: string, roles: string[] = [], status?: CareProcessStatus) {
        // 1. Resolve Permissions
        const permissions = getPermissionsForRoles(roles);
        const canSupervise = permissions.includes(AppPermission.COUNSELING_VIEW_SUPERVISION);

        // 2. Identify and fetch member to get their church
        const member = await this.memberRep.findOne({ where: { id: memberId }, relations: ['church'] });
        if (!member) return [];

        // 3. Find processes where I am a participant
        const myParticipations = await this.participantRep.find({
            where: { member: { id: memberId } },
            relations: ['process']
        });
        const myProcessIds = myParticipations.map(p => p.process.id);

        const query = this.processRep.createQueryBuilder('p')
            .leftJoinAndSelect('p.participants', 'part')
            .leftJoinAndSelect('part.member', 'm')
            .leftJoinAndSelect('m.person', 'per')
            .orderBy('p.updatedAt', 'DESC');

        if (status) {
            query.andWhere('p.status = :status', { status });
        }

        if (canSupervise) {
            // Supervisor: My processes OR all FORMAL processes of my church
            query.andWhere(
                '(p.id IN (:...myIds) OR (p.type = :formalType AND p.church_id = :churchId))',
                {
                    myIds: myProcessIds.length > 0 ? myProcessIds : [null],
                    formalType: CareProcessType.FORMAL,
                    churchId: member.church.id
                }
            );
        } else {
            // Regular user: Only where I am a participant
            if (myProcessIds.length === 0) return [];
            query.andWhere('p.id IN (:...myIds)', { myIds: myProcessIds });
        }

        return query.getMany();
    }

    async findOne(processId: string, memberId: string, personId: string, roles: string[] = []) {
        const permissions = getPermissionsForRoles(roles);
        const canSupervise = permissions.includes(AppPermission.COUNSELING_VIEW_SUPERVISION);

        const process = await this.processRep.findOne({
            where: { id: processId },
            relations: [
                'church',
                'participants',
                'participants.member',
                'participants.member.person',
                'notes',
                'notes.author',
                'notes.author.person',
                'notes.session'
            ]
        });

        if (!process) throw new NotFoundException('Proceso no encontrado');

        // Check permission
        const myParticipant = process.participants.find(p => {
            if (memberId && p.member.id === memberId) return true;
            if (personId && p.member.person?.id === personId) return true;
            return false;
        });

        // Supervision logic: If not participant, check if Pastor/Supervisor of this church for FORMAL process
        let isSupervising = false;
        if (!myParticipant && canSupervise && process.type === CareProcessType.FORMAL) {
            // Check if requester belongs to same church
            const requester = await this.memberRep.findOne({ where: { id: memberId }, relations: ['church'] });
            if (requester && requester.church.id === process.church.id) {
                isSupervising = true;
            }
        }

        if (!myParticipant && !isSupervising) {
            throw new ForbiddenException('No tienes acceso a este proceso de consejería');
        }

        // Filter notes based on strict visibility rules
        process.notes = process.notes.filter(note => {
            // 1. Author always sees their notes
            if (memberId && note.author.id === memberId) return true;
            if (personId && note.author.person?.id === personId) return true;

            // 2. PERSONAL notes only seen by author
            if (note.visibility === CareNoteVisibility.PERSONAL) return false;

            // 3. SUPERVISION notes seen by COUNSELOR, SUPERVISOR, or authorized Pastor (isSupervising)
            if (note.visibility === CareNoteVisibility.SUPERVISION) {
                return (myParticipant && (myParticipant.role === CareParticipantRole.COUNSELOR || myParticipant.role === CareParticipantRole.SUPERVISOR)) || isSupervising;
            }

            // 4. SHARED notes seen by everyone in process
            if (note.visibility === CareNoteVisibility.SHARED) {
                // Supervisors (Pastors) requested NOT to see SHARED notes, ONLY Supervision notes.
                // Unless they are participants.
                if (isSupervising) return false;
                return true;
            }

            return false;
        });

        return process;
    }

    // --- STATUS MANAGEMENT ---

    async updateStatus(processId: string, memberId: string, newStatus: CareProcessStatus) {
        const process = await this.processRep.findOne({ where: { id: processId }, relations: ['participants', 'participants.member'] });
        if (!process) throw new NotFoundException('Proceso no encontrado');

        const participant = process.participants.find(p => p.member.id === memberId || (p.member.person?.id === memberId));
        // Note: Sometimes the client sends personId as memberId if they are not distinguished correctly in JWT payload or context logic
        if (!participant) throw new ForbiddenException('No eres participante de este proceso');

        // COUNSELEE can only transition from PENDING_ACCEPTANCE to ACTIVE
        if (participant.role === CareParticipantRole.COUNSELEE) {
            if (newStatus !== CareProcessStatus.ACTIVE || process.status !== CareProcessStatus.PENDING_ACCEPTANCE) {
                throw new ForbiddenException('El aconsejado solo puede aceptar un proceso pendiente');
            }
            // Mark the participant as accepted
            participant.accepted = true;
            participant.acceptedAt = new Date();
            await this.participantRep.save(participant);
        } else if (participant.role !== CareParticipantRole.COUNSELOR) {
            throw new ForbiddenException('Solo el consejero o el aconsejado (para aceptar) pueden cambiar el estado');
        }

        // State Machine validation for COUNSELOR or shared logic
        if (newStatus === CareProcessStatus.PAUSED) {
            // Valid from ACTIVE
            if (process.status !== CareProcessStatus.ACTIVE) throw new BadRequestException('Solo procesos activos pueden pausarse');
        }

        if (newStatus === CareProcessStatus.ACTIVE && participant.role === CareParticipantRole.COUNSELOR) {
            // Valid from PAUSED or PENDING_ACCEPTANCE (if accepted)
            if (process.status === CareProcessStatus.DRAFT) throw new BadRequestException('Debe pasar a pendiente de aceptación primero');
        }

        process.status = newStatus;
        return this.processRep.save(process);
    }

    // --- NOTES ---

    async updateProcess(id: string, updateData: { motive?: string, status?: CareProcessStatus }) {
        const process = await this.processRep.findOne({ where: { id } });
        if (!process) throw new NotFoundException('Proceso de consejería no encontrado');

        if (updateData.motive) process.motive = updateData.motive;
        if (updateData.status) process.status = updateData.status;

        return this.processRep.save(process);
    }

    async addNote(processId: string, authorId: string, content: string, visibility: CareNoteVisibility, title?: string, sessionId?: string) {
        const process = await this.processRep.findOne({ where: { id: processId }, relations: ['participants'] });
        if (!process) throw new NotFoundException('Proceso no encontrado');

        const author = await this.memberRep.findOne({ where: { id: authorId } });
        const participant = process.participants.find(p => p.member.id === authorId);

        if (!author || !participant) throw new ForbiddenException('No eres participante de este proceso');

        // Only COUNSELOR or SUPERVISOR can add notes
        if (participant.role === CareParticipantRole.COUNSELEE) {
            throw new ForbiddenException('El aconsejado no puede crear notas');
        }

        // Rules
        if (process.type === CareProcessType.INFORMAL && visibility !== CareNoteVisibility.PERSONAL) {
            throw new BadRequestException('En procesos informales solo se permiten notas personales');
        }

        // Generate Title if missing
        const finalTitle = title || content.split(' ').slice(0, 5).join(' ') + '...';

        let session: CareSession | null = null;
        if (sessionId) {
            session = await this.sessionRepository.findOne({ where: { id: sessionId, process: { id: processId } } });
            if (!session) throw new NotFoundException('Sesión no encontrada o no pertenece a este proceso');
        }

        const note = this.noteRep.create({
            process,
            author,
            content,
            title: finalTitle,
            visibility,
            session
        });

        return this.noteRep.save(note);
    }

    async updateNote(id: string, memberId: string, updateData: { content?: string, title?: string, visibility?: CareNoteVisibility }) {
        const note = await this.noteRep.findOne({ where: { id }, relations: ['author', 'process', 'process.participants', 'process.participants.member'] });
        if (!note) throw new NotFoundException('Nota no encontrada');

        const participant = note.process.participants.find(p => p.member.id === memberId);
        if (!participant) throw new ForbiddenException('No tienes acceso a esta nota');

        if (note.author.id !== memberId && participant.role !== CareParticipantRole.COUNSELOR) {
            throw new ForbiddenException('Solo el autor o el consejero pueden editar la nota');
        }

        if (updateData.content !== undefined) note.content = updateData.content;
        if (updateData.title !== undefined) note.title = updateData.title;
        if (updateData.visibility !== undefined) {
            if (note.process.type === CareProcessType.INFORMAL && updateData.visibility !== CareNoteVisibility.PERSONAL) {
                throw new BadRequestException('En procesos informales solo se permiten notas personales');
            }
            note.visibility = updateData.visibility;
        }

        return this.noteRep.save(note);
    }

    async deleteNote(id: string, memberId: string) {
        const note = await this.noteRep.findOne({ where: { id }, relations: ['author', 'process', 'process.participants', 'process.participants.member'] });
        if (!note) throw new NotFoundException('Nota no encontrada');

        const participant = note.process.participants.find(p => p.member.id === memberId);
        if (!participant) throw new ForbiddenException('No tienes acceso a esta nota');

        if (note.author.id !== memberId && participant.role !== CareParticipantRole.COUNSELOR) {
            throw new ForbiddenException('Solo el autor o el consejero pueden eliminar la nota');
        }

        return this.noteRep.remove(note);
    }

    // --- SESSIONS & TASKS ---

    async createSession(
        processId: string,
        authorId: string,
        date: Date,
        durationMinutes: number,
        topics?: string,
        location?: string,
        initialNote?: { content: string, visibility: CareNoteVisibility, title?: string }
    ) {
        const process = await this.processRep.findOne({ where: { id: processId } });
        if (!process) throw new NotFoundException('Proceso no encontrado');

        if (process.status !== CareProcessStatus.ACTIVE) {
            throw new BadRequestException('No se pueden agendar sesiones en un proceso que no está activo');
        }

        const status = date < new Date() ? CareSessionStatus.COMPLETED : CareSessionStatus.SCHEDULED;

        const session = await this.sessionRepository.save(this.sessionRepository.create({
            process,
            date,
            durationMinutes,
            topics,
            location,
            status
        }));

        // If initial note provided, create it
        if (initialNote && initialNote.content) {
            const author = await this.memberRep.findOne({ where: { id: authorId } });
            if (author) {
                await this.noteRep.save(this.noteRep.create({
                    process,
                    session,
                    author,
                    content: initialNote.content,
                    title: initialNote.title || 'Nota de Encuentro',
                    visibility: initialNote.visibility
                }));
            }
        }

        return session;
    }

    async findAllSessions(processId: string, memberId: string, personId: string, roles: string[] = []) {
        // Enforce the same access check as findOne (to ensure read-only or participant access)
        const process = await this.findOne(processId, memberId, personId, roles);

        // Determine if user is a participant
        const myParticipant = process.participants.find(p => {
            if (memberId && p.member.id === memberId) return true;
            if (personId && p.member.person?.id === personId) return true;
            return false;
        });

        // If NOT participant (meaning they are a Supervisor/Admin viewing via permission), 
        // they should NOT see tasks.
        const isSupervisorOnly = !myParticipant;

        const relations = ['notes', 'notes.author', 'notes.author.person'];
        if (!isSupervisorOnly) {
            relations.push('tasks');
        }

        const sessions = await this.sessionRepository.find({
            where: { process: { id: processId } },
            relations,
            order: { date: 'ASC' }
        });

        if (isSupervisorOnly) {
            // Additional filtering for session notes if needed, 
            // though findOne filters process-level notes, sessions have their own notes relation?
            // The structure shows sessions have notes. We need to filter those too.
            // Currently findOne filters `process.notes`. `sessions.notes` are separate.

            sessions.forEach(session => {
                if (session.notes) {
                    session.notes = session.notes.filter(note => {
                        // Supervisor sees ONLY SUPERVISION notes
                        if (note.visibility === CareNoteVisibility.SUPERVISION) return true;
                        // Author sees their own notes (unlikely for pure supervisor in session unless they wrote it)
                        if (memberId && note.author.id === memberId) return true;
                        return false;
                    });
                }
                // Double check tasks are gone (though we didn't include relation, safe to ensure)
                delete session.tasks;
            });
        }

        return sessions;
    }

    async addTask(sessionId: string, description: string, title?: string) {
        const session = await this.sessionRepository.findOne({
            where: { id: sessionId },
            relations: ['process']
        });
        if (!session) throw new NotFoundException('Sesión no encontrada');

        if (session.process.type === CareProcessType.INFORMAL) {
            throw new BadRequestException('No se pueden asignar tareas en procesos informales');
        }

        // Generate Title if missing
        const finalTitle = title || description.split(' ').slice(0, 5).join(' ') + '...';

        const task = this.taskRepository.create({
            session,
            description,
            title: finalTitle,
            status: CareTaskStatus.PENDING
        });

        return this.taskRepository.save(task);
    }

    async updateTask(taskId: string, description?: string, response?: string, feedback?: string, status?: CareTaskStatus) {
        const task = await this.taskRepository.findOne({ where: { id: taskId } });
        if (!task) throw new NotFoundException('Tarea no encontrada');

        if (description !== undefined) task.description = description;
        if (response !== undefined) task.counseleeResponse = response;
        if (feedback !== undefined) task.counselorFeedback = feedback;
        if (status !== undefined) task.status = status;

        return this.taskRepository.save(task);
    }

    async deleteTask(taskId: string) {
        const task = await this.taskRepository.findOne({ where: { id: taskId } });
        if (!task) throw new NotFoundException('Tarea no encontrada');
        return this.taskRepository.remove(task);
    }

    // --- HELPERS ---

    private async addParticipant(processId: string, member: Member, role: CareParticipantRole, accepted: boolean = false) {
        const part = this.participantRep.create({
            process: { id: processId },
            member,
            role,
            accepted,
            acceptedAt: accepted ? new Date() : null
        });
        return this.participantRep.save(part);
    }
}
