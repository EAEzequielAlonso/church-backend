import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { CreateFollowupUseCase } from './use-cases/create-followup.use-case';
import { GetFollowupsUseCase } from './use-cases/get-followups.use-case';
import { GetFollowupDetailUseCase } from './use-cases/get-followup-detail.use-case';
import { UpdateFollowupUseCase } from './use-cases/update-followup.use-case';
import { AssignFollowupUseCase } from './use-cases/assign-followup.use-case';
import { ChangeFollowupStatusUseCase } from './use-cases/change-followup-status.use-case';
import { CreateFollowupNoteUseCase } from './use-cases/create-followup-note.use-case';
import { GetFollowupNotesUseCase } from './use-cases/get-followup-notes.use-case';
import { RemoveFollowupUseCase } from './use-cases/remove-followup.use-case';
import { PromoteToMemberUseCase } from './use-cases/promote-to-member.use-case';
import { UpdateFollowupNoteUseCase } from './use-cases/update-followup-note.use-case';
import { DeleteFollowupNoteUseCase } from './use-cases/delete-followup-note.use-case';
import { FollowUpStatus } from '../common/enums';
import { FollowUpNoteType } from './enums/follow-up-note-type.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentChurch, CurrentUser } from '../common/decorators';

@Controller('follow-ups')
@UseGuards(JwtAuthGuard)
export class FollowUpsController {
    constructor(
        private readonly createFollowupUseCase: CreateFollowupUseCase,
        private readonly getFollowupsUseCase: GetFollowupsUseCase,
        private readonly getFollowupDetailUseCase: GetFollowupDetailUseCase,
        private readonly updateFollowupUseCase: UpdateFollowupUseCase,
        private readonly assignFollowupUseCase: AssignFollowupUseCase,
        private readonly changeStatusUseCase: ChangeFollowupStatusUseCase,
        private readonly createNoteUseCase: CreateFollowupNoteUseCase,
        private readonly getNotesUseCase: GetFollowupNotesUseCase,
        private readonly removeUseCase: RemoveFollowupUseCase,
        private readonly promoteUseCase: PromoteToMemberUseCase,
        private readonly updateNoteUseCase: UpdateFollowupNoteUseCase,
        private readonly deleteNoteUseCase: DeleteFollowupNoteUseCase,
    ) { }

    @Post()
    create(
        @CurrentChurch() churchId: string,
        @CurrentUser() user: any,
        @Body() data: any
    ) {
        return this.createFollowupUseCase.execute(churchId, user.memberId, data);
    }

    @Get('search')
    async search(
        @CurrentChurch() churchId: string,
        @CurrentUser() user: any,
        @Query('q') query: string
    ) {
        const result = await this.getFollowupsUseCase.execute(churchId, user, {
            search: query,
            page: 1,
            limit: 20
        });
        return result.data;
    }

    @Get()
    findAll(
        @CurrentChurch() churchId: string,
        @CurrentUser() user: any,
        @Query('status') status?: FollowUpStatus,
        @Query('search') search?: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('assignedToMe') assignedToMe?: any
    ) {
        const isAssignedToMe = assignedToMe === 'true' || assignedToMe === true;
        return this.getFollowupsUseCase.execute(churchId, user, {
            status,
            search,
            page: Number(page),
            limit: Number(limit),
            assignedToMe: isAssignedToMe
        });
    }

    @Get(':id')
    findOne(
        @CurrentChurch() churchId: string,
        @CurrentUser() user: any,
        @Param('id') id: string
    ) {
        return this.getFollowupDetailUseCase.execute(churchId, id, user);
    }

    @Patch(':id')
    update(
        @CurrentChurch() churchId: string,
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Body() data: any
    ) {
        return this.updateFollowupUseCase.execute(churchId, id, data, user);
    }

    @Patch(':id/assign')
    assign(
        @CurrentChurch() churchId: string,
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Body('memberId') memberId: string
    ) {
        return this.assignFollowupUseCase.execute(churchId, id, memberId, user);
    }

    @Patch(':id/status')
    changeStatus(
        @CurrentChurch() churchId: string,
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Body('status') status: FollowUpStatus
    ) {
        return this.changeStatusUseCase.execute(churchId, id, status, user);
    }

    @Patch(':id/notes/:noteId')
    updateNote(
        @CurrentChurch() churchId: string,
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Param('noteId') noteId: string,
        @Body() data: { text?: string; type?: FollowUpNoteType }
    ) {
        return this.updateNoteUseCase.execute(churchId, noteId, data, user);
    }

    @Delete(':id/notes/:noteId')
    deleteNote(
        @CurrentChurch() churchId: string,
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Param('noteId') noteId: string
    ) {
        return this.deleteNoteUseCase.execute(churchId, noteId, user);
    }

    @Post(':id/notes')
    createNote(
        @CurrentChurch() churchId: string,
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Body() data: { text: string; type: FollowUpNoteType }
    ) {
        // Fallback for personId if not in user object (though usually is)
        const personId = user.personId || user.id;
        return this.createNoteUseCase.execute(churchId, id, personId, user, data);
    }

    @Get(':id/notes')
    getNotes(
        @CurrentChurch() churchId: string,
        @CurrentUser() user: any,
        @Param('id') id: string
    ) {
        return this.getNotesUseCase.execute(churchId, id, user);
    }

    @Delete(':id')
    remove(
        @CurrentChurch() churchId: string,
        @CurrentUser() user: any,
        @Param('id') id: string
    ) {
        return this.removeUseCase.execute(churchId, id, user);
    }

    @Post(':id/promote-member')
    promote(
        @CurrentChurch() churchId: string,
        @CurrentUser() user: any,
        @Param('id') id: string
    ) {
        return this.promoteUseCase.execute(churchId, id, user);
    }
}
