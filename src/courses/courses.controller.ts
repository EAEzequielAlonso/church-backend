import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, UnauthorizedException, ForbiddenException, Query } from '@nestjs/common';
import { CreateCourseDto, UpdateCourseDto, CreateSessionDto, AddParticipantDto, AddGuestDto } from './dto/create-course.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EcclesiasticalRole, FunctionalRole, ProgramType, SystemRole } from '../common/enums';
import { Roles } from 'src/auth/guards/roles.guard';

// Use Cases
import { ManageCourseUseCase } from './use-cases/manage-course.use-case';
import { DeleteCourseUseCase } from './use-cases/delete-course.use-case';
import { ViewCourseUseCase } from './use-cases/view-course.use-case';
import { ManageSessionUseCase } from './use-cases/manage-session.use-case';
import { EnrollParticipantUseCase } from './use-cases/enroll-participant.use-case';
import { RemoveParticipantUseCase } from './use-cases/remove-participant.use-case';
import { AddGuestUseCase } from './use-cases/add-guest.use-case';
import { RemoveGuestUseCase } from './use-cases/remove-guest.use-case';
import { UpdateGuestUseCase } from './use-cases/update-guest.use-case';
import { PromoteGuestUseCase } from './use-cases/promote-guest.use-case';
import { RegisterAttendanceUseCase } from './use-cases/register-attendance.use-case';
import { GetCourseStatsUseCase } from './use-cases/get-course-stats.use-case';
import { GetAttendanceUseCase } from './use-cases/get-attendance.use-case';
import { PeopleFunnelService } from './people-funnel.service';

@Controller('courses')
@UseGuards(JwtAuthGuard)
export class CoursesController {
    constructor(
        private readonly manageCourseUseCase: ManageCourseUseCase,
        private readonly deleteCourseUseCase: DeleteCourseUseCase,
        private readonly viewCourseUseCase: ViewCourseUseCase,
        private readonly manageSessionUseCase: ManageSessionUseCase,
        private readonly enrollParticipantUseCase: EnrollParticipantUseCase,
        private readonly removeParticipantUseCase: RemoveParticipantUseCase,
        private readonly addGuestUseCase: AddGuestUseCase,
        private readonly removeGuestUseCase: RemoveGuestUseCase,
        private readonly updateGuestUseCase: UpdateGuestUseCase,
        private readonly promoteGuestUseCase: PromoteGuestUseCase,
        private readonly registerAttendanceUseCase: RegisterAttendanceUseCase,
        private readonly getCourseStatsUseCase: GetCourseStatsUseCase,
        private readonly getAttendanceUseCase: GetAttendanceUseCase,
        private readonly peopleFunnelService: PeopleFunnelService
    ) { }

    private checkCanManage(roles: string[], ecclesiasticalRole?: string) {
        const isSystemAdmin = roles.includes(SystemRole.ADMIN_APP);
        const isChurchAdmin = roles.includes(FunctionalRole.ADMIN_CHURCH);
        const isAuditor = roles.includes(FunctionalRole.AUDITOR);
        const isMinistryLeader = roles.includes(FunctionalRole.MINISTRY_LEADER);
        const isPastor = ecclesiasticalRole === EcclesiasticalRole.PASTOR;

        if (!isSystemAdmin && !isChurchAdmin && !isAuditor && !isPastor && !isMinistryLeader) {
            throw new ForbiddenException('No tiene permisos para gestionar cursos o actividades');
        }
    }

    @Post()
    create(@Body() createDto: CreateCourseDto, @Request() req) {
        if (!req.user.memberId) throw new UnauthorizedException('Usuario no tiene miembro asociado');
        this.checkCanManage(req.user.roles || [], req.user.ecclesiasticalRole);
        return this.manageCourseUseCase.create(createDto, req.user.memberId);
    }

    @Get()
    findAll(@Request() req, @Query('type') type?: ProgramType) {
        if (!req.user.memberId) throw new UnauthorizedException('Debe estar activamente vinculado a una iglesia (memberId missing)');

        const roles = req.user.roles || [];
        const isPrivileged = roles.includes('ADMIN_APP') ||
            roles.includes('PASTOR') ||
            roles.includes('ADMIN_CHURCH') ||
            roles.includes('MINISTRY_LEADER');

        return this.viewCourseUseCase.findAll(req.user.memberId, isPrivileged, type);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.viewCourseUseCase.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdateCourseDto, @Request() req) {
        this.checkCanManage(req.user.roles || [], req.user.ecclesiasticalRole);
        return this.manageCourseUseCase.update(id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        this.checkCanManage(req.user.roles || [], req.user.ecclesiasticalRole);
        return this.deleteCourseUseCase.execute(id);
    }

    @Post(':id/sessions')
    createSession(@Param('id') id: string, @Body() createDto: CreateSessionDto, @Request() req) {
        this.checkCanManage(req.user.roles || [], req.user.ecclesiasticalRole);
        return this.manageSessionUseCase.create(id, createDto);
    }

    @Post(':id/participants')
    addParticipant(@Param('id') id: string, @Body() dto: AddParticipantDto, @Request() req) {
        this.checkCanManage(req.user.roles || [], req.user.ecclesiasticalRole);
        return this.enrollParticipantUseCase.execute(id, [dto.memberId], undefined, dto.role);
    }

    @Post(':id/join')
    join(@Param('id') id: string, @Body() body: { memberIds: string[] }, @Request() req) {
        if (!req.user.memberId) throw new UnauthorizedException('Usuario no vinculado a miembro');
        return this.enrollParticipantUseCase.execute(id, body.memberIds, req.user.memberId);
    }

    @Post(':id/leave')
    leave(@Param('id') id: string, @Request() req) {
        if (!req.user.memberId) throw new UnauthorizedException('Usuario no vinculado a miembro');
        return this.removeParticipantUseCase.executeForMember(id, req.user.memberId);
    }

    @Delete('participants/:participantId')
    removeParticipant(@Param('participantId') participantId: string, @Request() req) {
        this.checkCanManage(req.user.roles || [], req.user.ecclesiasticalRole);
        return this.removeParticipantUseCase.execute(participantId);
    }

    @Post(':id/guests')
    addGuest(@Param('id') id: string, @Body() dto: AddGuestDto, @Request() req) {
        this.checkCanManage(req.user.roles || [], req.user.ecclesiasticalRole);
        return this.addGuestUseCase.execute(id, dto);
    }

    @Delete('guests/:guestId')
    removeGuest(@Param('guestId') guestId: string, @Request() req) {
        this.checkCanManage(req.user.roles || [], req.user.ecclesiasticalRole);
        return this.removeGuestUseCase.execute(guestId);
    }

    @Patch('guests/:guestId')
    updateGuest(@Param('guestId') guestId: string, @Body() dto: Partial<AddGuestDto>, @Request() req) {
        this.checkCanManage(req.user.roles || [], req.user.ecclesiasticalRole);
        return this.updateGuestUseCase.execute(guestId, dto);
    }

    @Post('guests/:guestId/promote-to-visitor')
    promoteGuest(@Param('guestId') guestId: string, @Request() req) {
        if (!req.user.memberId) throw new UnauthorizedException('Usuario no vinculado a miembro');
        this.checkCanManage(req.user.roles || [], req.user.ecclesiasticalRole);
        return this.promoteGuestUseCase.toVisitor(guestId, req.user.memberId);
    }

    @Post('guests/:guestId/promote-to-member')
    promoteGuestToMember(@Param('guestId') guestId: string, @Request() req) {
        if (!req.user.memberId) throw new UnauthorizedException('Usuario no vinculado a miembro');
        this.checkCanManage(req.user.roles || [], req.user.ecclesiasticalRole);
        return this.promoteGuestUseCase.toMember(guestId);
    }

    @Post('sessions/:id/attendance')
    @Roles(EcclesiasticalRole.PASTOR, FunctionalRole.MINISTRY_LEADER, FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR)
    registerAttendance(@Param('id') sessionId: string, @Body() items: any[]) {
        return this.registerAttendanceUseCase.execute(sessionId, items);
    }

    @Get(':id/stats')
    @Roles(EcclesiasticalRole.PASTOR, FunctionalRole.MINISTRY_LEADER, FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR)
    getStats(@Param('id') id: string) {
        return this.getCourseStatsUseCase.execute(id);
    }

    @Get('sessions/:id/attendance')
    @Roles(EcclesiasticalRole.PASTOR, FunctionalRole.MINISTRY_LEADER, FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR)
    getAttendance(@Param('id') sessionId: string) {
        return this.getAttendanceUseCase.execute(sessionId);
    }

    @Get('search/invited')
    searchInvited(@Query('q') q: string, @Request() req) {
        this.checkCanManage(req.user.roles || [], req.user.ecclesiasticalRole);
        return this.peopleFunnelService.search(q);
    }

    @Patch('sessions/:sessionId')
    updateSession(@Param('sessionId') sessionId: string, @Body() dto: Partial<CreateSessionDto>, @Request() req) {
        this.checkCanManage(req.user.roles || [], req.user.ecclesiasticalRole);
        return this.manageSessionUseCase.update(sessionId, dto);
    }
}
