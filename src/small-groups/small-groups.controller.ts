import { Controller, Get, Post, Body, Patch, Param, Delete, Request, UseGuards, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.guard';
import { FunctionalRole } from '../common/enums';
import { AgendaService } from '../agenda/agenda.service';
import { EnrollMemberUseCase } from './use-cases/enroll-member.use-case';
import { ManageSmallGroupUseCase } from './use-cases/manage-small-group.use-case';
import { ViewSmallGroupUseCase } from './use-cases/view-small-group.use-case';
import { AddGuestUseCase } from './use-cases/add-guest.use-case';
import { DeleteSmallGroupUseCase } from './use-cases/delete-small-group.use-case';
import { RemoveMemberUseCase } from './use-cases/remove-member.use-case';
import { RemoveGuestUseCase } from './use-cases/remove-guest.use-case';

@Controller('small-groups')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SmallGroupsController {
    constructor(
        private readonly agendaService: AgendaService,
        private readonly enrollMemberUseCase: EnrollMemberUseCase,
        private readonly manageSmallGroupUseCase: ManageSmallGroupUseCase,
        private readonly viewSmallGroupUseCase: ViewSmallGroupUseCase,
        private readonly addGuestUseCase: AddGuestUseCase,
        private readonly deleteSmallGroupUseCase: DeleteSmallGroupUseCase,
        private readonly removeMemberUseCase: RemoveMemberUseCase,
        private readonly removeGuestUseCase: RemoveGuestUseCase,
    ) { }

    @Post()
    @Roles(FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR)
    create(@Body() createDto: any, @Request() req) {
        const churchId = req.user?.churchId || createDto.churchId;
        return this.manageSmallGroupUseCase.create(createDto, churchId);
    }

    @Get()
    findAll(@Request() req) {
        const churchId = req.user?.churchId || req.query.churchId;
        return this.viewSmallGroupUseCase.findAllByChurch(churchId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.viewSmallGroupUseCase.findOne(id);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateDto: any, @Request() req) {
        const isPrivileged = req.user?.roles?.includes(FunctionalRole.ADMIN_CHURCH) || req.user?.roles?.includes(FunctionalRole.AUDITOR);
        return this.manageSmallGroupUseCase.update(id, updateDto, req.user, isPrivileged);
    }

    @Delete(':id')
    @Roles(FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR)
    remove(@Param('id') id: string, @Request() req) {
        return this.deleteSmallGroupUseCase.execute(id, req.user);
    }

    @Post(':id/members')
    async addMember(@Param('id') id: string, @Body('memberId') memberId: string, @Request() req) {
        // UseCase handles permission checks
        const isPrivileged = req.user?.roles?.includes(FunctionalRole.ADMIN_CHURCH) || req.user?.roles?.includes(FunctionalRole.AUDITOR);
        return this.enrollMemberUseCase.execute(id, memberId, req.user, isPrivileged);
    }

    @Delete(':id/members/:memberId')
    async removeMember(@Param('id') id: string, @Param('memberId') memberId: string, @Request() req) {
        return this.removeMemberUseCase.execute(id, memberId, req.user);
    }

    @Post(':id/guests')
    async addGuest(@Param('id') id: string, @Body() guestDto: any, @Request() req) {
        const isPrivileged = req.user?.roles?.includes(FunctionalRole.ADMIN_CHURCH) || req.user?.roles?.includes(FunctionalRole.AUDITOR);
        return this.addGuestUseCase.execute(id, guestDto, req.user, isPrivileged);
    }

    @Delete(':id/guests/:guestId')
    async removeGuest(@Param('id') id: string, @Param('guestId') guestId: string, @Request() req) {
        const isPrivileged = req.user?.roles?.includes(FunctionalRole.ADMIN_CHURCH) || req.user?.roles?.includes(FunctionalRole.AUDITOR);
        return this.removeGuestUseCase.execute(id, guestId, req.user, isPrivileged);
    }

    @Post(':id/join')
    async join(@Param('id') id: string, @Request() req) {
        const memberId = req.user.memberId;
        if (!memberId) throw new UnauthorizedException('No eres un miembro de la iglesia');
        // Self-join: validated inside UseCase (user.memberId === memberId)
        return this.enrollMemberUseCase.execute(id, memberId, req.user);
    }

    @Delete(':id/leave')
    async leave(@Param('id') id: string, @Request() req) {
        const memberId = req.user.memberId;
        if (!memberId) throw new UnauthorizedException('No eres un miembro de la iglesia');
        return this.removeMemberUseCase.execute(id, memberId, req.user);
    }

    @Post('events/:eventId/attendance')
    async markAttendance(@Param('eventId') eventId: string, @Body() body: { personIds: string[] }) {
        return this.agendaService.markAttendance(eventId, body.personIds);
    }
}
