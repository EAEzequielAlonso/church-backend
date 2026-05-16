import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { SecurityContextGuard } from '../auth/guards/security-context.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentChurch, CurrentUser } from '../common/decorators';
import { SecurityContext } from '../auth/security-context.interface';
import { AppPermission } from '../auth/authorization/permissions.enum';

import { MentorshipResponseDto } from './dto/mentorship-response.dto';

// DTOs de Use Cases
import { CreateMentorshipProcessDto } from './dto/create-mentorship-process.dto';
import {
  AddMeetingDto,
  AddNoteDto,
  AddTaskDto,
  UpdateNoteDto,
} from './dto/mentorship-content.dto';
import { HardDeleteMentorshipProcessDto } from './dto/hard-delete-mentorship.dto';
import { UpdateMentorshipProcessDto } from './dto/update-mentorship-process.dto';
import { AddParticipantToProcessDto } from './dto/mentorship-mutation.dto';

// Use Cases
import { CreateMentorshipProcessUseCase } from './use-cases/create-mentorship-process.use-case';
import { AddMeetingUseCase } from './use-cases/add-meeting.use-case';
import { UpdateMeetingUseCase } from './use-cases/update-meeting.use-case';
import { DeleteMeetingUseCase } from './use-cases/delete-meeting.use-case';
import { AddNoteUseCase } from './use-cases/add-note.use-case';
import { AddTaskUseCase } from './use-cases/add-task.use-case';
import { HardDeleteMentorshipProcessUseCase } from './use-cases/hard-delete-mentorship.use-case';
import { GetMentorshipsUseCase } from './use-cases/get-mentorships.use-case';
import { GetMentorshipByIdUseCase } from './use-cases/get-mentorship-by-id.use-case';
import { GetInvitationsUseCase } from './use-cases/get-invitations.use-case';
import { AcceptParticipationUseCase } from './use-cases/accept-participation.use-case';
import { DeclineParticipationUseCase } from './use-cases/decline-participation.use-case';
import { GetNotesUseCase } from './use-cases/get-notes.use-case';
import { GetTasksUseCase } from './use-cases/get-tasks.use-case';
import { UpdateNoteUseCase } from './use-cases/update-note.use-case';
import { DeleteNoteUseCase } from './use-cases/delete-note.use-case';
import { StartTaskUseCase } from './use-cases/start-task.use-case';
import { SubmitTaskUseCase } from './use-cases/submit-task.use-case';
import { ReviewTaskUseCase } from './use-cases/review-task.use-case';
import { SaveTaskProgressUseCase } from './use-cases/save-task-progress.use-case';
import { UpdateTaskUseCase } from './use-cases/update-task.use-case';
import { DeleteTaskUseCase } from './use-cases/delete-task.use-case';
import { UpdateMentorshipProcessUseCase } from './use-cases/update-mentorship-process.use-case';
import { AddParticipantToProcessUseCase } from './use-cases/add-participant.use-case';
import { GetMentorshipsDto } from './dto/get-mentorships.dto';
import { GetNotesDto } from './dto/get-notes.dto';
import { GetTasksDto } from './dto/get-tasks.dto';

import { SubscriptionGuard } from '../subscriptions/guards/subscription.guard';
@ApiTags('Mentorship')
@Controller('mentorship')
@UseGuards(JwtAuthGuard, SecurityContextGuard, PermissionsGuard, SubscriptionGuard)
@ApiBearerAuth()
export class MentorshipController {
  constructor(
    private readonly createUseCase: CreateMentorshipProcessUseCase,
    private readonly addMeetingUseCase: AddMeetingUseCase,
    private readonly updateMeetingUseCase: UpdateMeetingUseCase,
    private readonly deleteMeetingUseCase: DeleteMeetingUseCase,
    private readonly addNoteUseCase: AddNoteUseCase,
    private readonly addTaskUseCase: AddTaskUseCase,
    private readonly hardDeleteUseCase: HardDeleteMentorshipProcessUseCase,
    private readonly getMentorshipsUseCase: GetMentorshipsUseCase,
    private readonly getMentorshipByIdUseCase: GetMentorshipByIdUseCase,
    private readonly getInvitationsUseCase: GetInvitationsUseCase,
    private readonly acceptParticipationUseCase: AcceptParticipationUseCase,
    private readonly declineParticipationUseCase: DeclineParticipationUseCase,
    private readonly getNotesUseCase: GetNotesUseCase,
    private readonly getTasksUseCase: GetTasksUseCase,
    private readonly updateNoteUseCase: UpdateNoteUseCase,
    private readonly deleteNoteUseCase: DeleteNoteUseCase,
    private readonly startTaskUseCase: StartTaskUseCase,
    private readonly submitTaskUseCase: SubmitTaskUseCase,
    private readonly reviewTaskUseCase: ReviewTaskUseCase,
    private readonly saveTaskProgressUseCase: SaveTaskProgressUseCase,
    private readonly updateTaskUseCase: UpdateTaskUseCase,
    private readonly deleteTaskUseCase: DeleteTaskUseCase,
    private readonly updateMentorshipUseCase: UpdateMentorshipProcessUseCase,
    private readonly addParticipantUseCase: AddParticipantToProcessUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Crear un nuevo proceso de mentoría (Discipulado o Consejería)',
  })
  async createProcess(
    @CurrentChurch() churchId: string,
    @Body() createDto: Omit<CreateMentorshipProcessDto, 'churchId'>,
    @CurrentUser() securityContext: SecurityContext,
  ): Promise<MentorshipResponseDto> {
    const result = await this.createUseCase.execute(
      { ...createDto, churchId },
      securityContext.functionalRoles || [],
      securityContext.churchPersonId,
    );
    return MentorshipResponseDto.fromEntity(result);
  }

  @Get()
  @ApiOperation({ summary: 'Listar procesos de mentoría paginados' })
  async getMentorships(
    @CurrentChurch() churchId: string,
    @Query() query: GetMentorshipsDto,
    @CurrentUser() securityContext: SecurityContext,
  ): Promise<{ data: MentorshipResponseDto[]; total: number }> {
    return this.getMentorshipsUseCase.execute(
      churchId,
      query,
      securityContext.churchPersonId,
      securityContext.permissions,
    );
  }

  @Get('invitations')
  @ApiOperation({ summary: 'Listar invitaciones de mentoría pendientes' })
  async getInvitations(
    @CurrentChurch() churchId: string,
    @Query() query: GetMentorshipsDto,
    @CurrentUser() securityContext: SecurityContext,
  ): Promise<{ data: MentorshipResponseDto[]; total: number }> {
    return this.getInvitationsUseCase.execute(
      churchId,
      query,
      securityContext.churchPersonId,
      securityContext.permissions,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener proceso de mentoría por ID' })
  async getProcess(
    @CurrentChurch() churchId: string,
    @Param('id') id: string,
    @CurrentUser() securityContext: SecurityContext,
  ): Promise<MentorshipResponseDto> {
    return this.getMentorshipByIdUseCase.execute(
      churchId,
      id,
      securityContext.churchPersonId,
      securityContext.permissions,
    );
  }

  @Post('participants/:id/accept')
  @ApiOperation({ summary: 'Aceptar una invitación de mentoría' })
  async acceptInvitation(
    @Param('id') participantId: string,
    @CurrentUser() securityContext: SecurityContext,
    @CurrentChurch() churchId: string,
  ): Promise<any> {
    return this.acceptParticipationUseCase.execute(
      participantId,
      securityContext.churchPersonId,
      churchId,
      securityContext.personId,
    );
  }

  @Post('participants/:id/decline')
  @ApiOperation({ summary: 'Rechazar una invitación de mentoría' })
  async declineInvitation(
    @Param('id') participantId: string,
    @CurrentUser() securityContext: SecurityContext,
    @CurrentChurch() churchId: string,
  ): Promise<any> {
    return this.declineParticipationUseCase.execute(
      participantId,
      securityContext.churchPersonId,
      churchId,
      securityContext.personId,
    );
  }

  @Post(':id/meetings')
  @ApiOperation({ summary: 'Añadir un encuentro a un proceso' })
  async addMeeting(
    @Param('id') processId: string,
    @Body() dto: Omit<AddMeetingDto, 'processId'>,
    @CurrentUser() securityContext: SecurityContext,
    @CurrentChurch() churchId: string,
  ): Promise<MentorshipResponseDto> {
    const result = await this.addMeetingUseCase.execute(
      { ...dto, processId },
      securityContext.churchPersonId,
      securityContext.functionalRoles || [],
      churchId,
    );
    return MentorshipResponseDto.fromEntity(result);
  }

  @Post(':id/meetings/:meetingId/update')
  @ApiOperation({ summary: 'Actualizar un encuentro de un proceso' })
  async updateMeeting(
    @Param('id') processId: string,
    @Param('meetingId') meetingId: string,
    @Body() dto: Partial<AddMeetingDto>,
    @CurrentUser() securityContext: SecurityContext,
    @CurrentChurch() churchId: string,
  ): Promise<MentorshipResponseDto> {
    const result = await this.updateMeetingUseCase.execute(
      processId,
      meetingId,
      dto,
      securityContext.churchPersonId,
      securityContext.functionalRoles || [],
      churchId,
    );
    return MentorshipResponseDto.fromEntity(result);
  }

  @Get(':id/notes')
  @ApiOperation({ summary: 'Listar notas de un proceso con filtros' })
  async getNotes(
    @Param('id') processId: string,
    @Query() query: GetNotesDto,
    @CurrentUser() securityContext: SecurityContext,
  ): Promise<any> {
    const result = await this.getNotesUseCase.execute(processId, query, {
      userId: securityContext.churchPersonId,
      churchId: securityContext.churchId,
      roles: securityContext.functionalRoles || [],
      permissions: securityContext.permissions || [],
    });
    return result;
  }

  @Get(':id/tasks')
  @ApiOperation({ summary: 'Listar tareas de un proceso con filtros' })
  async getTasks(
    @Param('id') processId: string,
    @Query() query: GetTasksDto,
    @CurrentUser() securityContext: SecurityContext,
  ): Promise<any> {
    const result = await this.getTasksUseCase.execute(processId, query, {
      userId: securityContext.churchPersonId,
      churchId: securityContext.churchId,
      roles: securityContext.functionalRoles || [],
      permissions: securityContext.permissions || [],
    });
    return result;
  }

  @Delete(':id/meetings/:meetingId')
  @ApiOperation({ summary: 'Eliminar un encuentro de un proceso' })
  async deleteMeeting(
    @Param('id') processId: string,
    @Param('meetingId') meetingId: string,
    @CurrentUser() securityContext: SecurityContext,
    @CurrentChurch() churchId: string,
  ): Promise<MentorshipResponseDto> {
    const result = await this.deleteMeetingUseCase.execute(
      processId,
      meetingId,
      securityContext.churchPersonId,
      securityContext.functionalRoles || [],
      churchId,
    );
    return MentorshipResponseDto.fromEntity(result);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'Añadir una nota a un proceso' })
  async addNote(
    @Param('id') processId: string,
    @Body() dto: Omit<AddNoteDto, 'processId'>,
    @CurrentUser() securityContext: SecurityContext,
  ): Promise<MentorshipResponseDto> {
    const result = await this.addNoteUseCase.execute(
      {
        ...dto,
        processId,
        authorChurchPersonId: securityContext.churchPersonId,
      },
      {
        userId: securityContext.churchPersonId,
        churchId: securityContext.churchId,
        roles: securityContext.functionalRoles || [],
        permissions: securityContext.permissions || [],
      },
    );
    return MentorshipResponseDto.fromEntity(result);
  }

  @Post(':id/tasks')
  @ApiOperation({ summary: 'Añadir una tarea a un proceso' })
  async addTask(
    @Param('id') processId: string,
    @Body() dto: Omit<AddTaskDto, 'processId'>,
    @CurrentUser() securityContext: SecurityContext,
  ): Promise<MentorshipResponseDto> {
    const result = await this.addTaskUseCase.execute(
      {
        ...dto,
        processId,
        creatorChurchPersonId: securityContext.churchPersonId,
      },
      {
        userId: securityContext.churchPersonId,
        churchId: securityContext.churchId,
        roles: securityContext.functionalRoles || [],
        permissions: securityContext.permissions || [],
      },
    );
    return MentorshipResponseDto.fromEntity(result);
  }

  @Patch('notes/:id')
  @ApiOperation({ summary: 'Actualizar una nota' })
  async updateNote(
    @Param('id') noteId: string,
    @Body() dto: UpdateNoteDto,
    @CurrentUser() securityContext: SecurityContext,
  ): Promise<any> {
    const result = await this.updateNoteUseCase.execute(noteId, dto, {
      userId: securityContext.churchPersonId,
      churchId: securityContext.churchId,
      roles: securityContext.functionalRoles || [],
      permissions: securityContext.permissions || [],
    });
    return result;
  }

  @Delete('notes/:id')
  @ApiOperation({ summary: 'Eliminar una nota' })
  async deleteNote(
    @Param('id') noteId: string,
    @CurrentUser() securityContext: SecurityContext,
  ): Promise<void> {
    await this.deleteNoteUseCase.execute(noteId, {
      userId: securityContext.churchPersonId,
      churchId: securityContext.churchId,
      roles: securityContext.functionalRoles || [],
      permissions: securityContext.permissions || [],
    });
  }

  @Post('tasks/:id/start')
  @ApiOperation({ summary: 'Iniciar una tarea' })
  async startTask(
    @Param('id') taskId: string,
    @CurrentUser() securityContext: SecurityContext,
  ): Promise<any> {
    const result = await this.startTaskUseCase.execute(taskId, {
      userId: securityContext.churchPersonId,
      churchId: securityContext.churchId,
      roles: securityContext.functionalRoles || [],
      permissions: securityContext.permissions || [],
    });
    return result;
  }

  @Post('tasks/:id/submit')
  @ApiOperation({ summary: 'Enviar una tarea completada' })
  async submitTask(
    @Param('id') taskId: string,
    @Body() dto: { menteeResponse: string },
    @CurrentUser() securityContext: SecurityContext,
  ): Promise<any> {
    const result = await this.submitTaskUseCase.execute(
      taskId,
      {
        userId: securityContext.churchPersonId,
        churchId: securityContext.churchId,
        roles: securityContext.functionalRoles || [],
        permissions: securityContext.permissions || [],
      },
      dto,
    );
    return result;
  }

  @Post('tasks/:id/save-progress')
  @ApiOperation({ summary: 'Guardar progreso de una tarea sin enviarla' })
  async saveTaskProgress(
    @Param('id') taskId: string,
    @Body() dto: { menteeResponse: string },
    @CurrentUser() securityContext: SecurityContext,
  ): Promise<any> {
    const result = await this.saveTaskProgressUseCase.execute(
      taskId,
      {
        userId: securityContext.churchPersonId,
        churchId: securityContext.churchId,
        roles: securityContext.functionalRoles || [],
        permissions: securityContext.permissions || [],
      },
      dto,
    );
    return result;
  }

  @Post('tasks/:id/review')
  @ApiOperation({ summary: 'Revisar una tarea enviada' })
  async reviewTask(
    @Param('id') taskId: string,
    @Body() dto: { mentorFeedback?: string },
    @CurrentUser() securityContext: SecurityContext,
  ): Promise<any> {
    const result = await this.reviewTaskUseCase.execute(
      taskId,
      {
        userId: securityContext.churchPersonId,
        churchId: securityContext.churchId,
        roles: securityContext.functionalRoles || [],
        permissions: securityContext.permissions || [],
      },
      dto,
    );
    return result;
  }

  @Patch('tasks/:id')
  @ApiOperation({ summary: 'Actualizar una tarea' })
  async updateTask(
    @Param('id') taskId: string,
    @Body() dto: Partial<AddTaskDto>,
    @CurrentUser() securityContext: SecurityContext,
  ): Promise<any> {
    const result = await this.updateTaskUseCase.execute(taskId, dto, {
      userId: securityContext.churchPersonId,
      churchId: securityContext.churchId,
      roles: securityContext.functionalRoles || [],
      permissions: securityContext.permissions || [],
    });
    return result;
  }

  @Delete('tasks/:id')
  @ApiOperation({ summary: 'Eliminar una tarea' })
  async deleteTask(
    @Param('id') taskId: string,
    @CurrentUser() securityContext: SecurityContext,
  ): Promise<any> {
    await this.deleteTaskUseCase.execute(taskId, {
      userId: securityContext.churchPersonId,
      churchId: securityContext.churchId,
      roles: securityContext.functionalRoles || [],
      permissions: securityContext.permissions || [],
    });
    return { success: true };
  }

  @Delete(':id')
  @RequirePermissions(AppPermission.COUNSELING_DELETE)
  @ApiOperation({ summary: 'Eliminar físicamente un proceso en cascada' })
  async hardDelete(
    @Param('id') processId: string,
    @Body() deleteInstruction: { confirmString: string },
    @CurrentUser() securityContext: SecurityContext,
    @CurrentChurch() churchId: string,
  ): Promise<{ message: string }> {
    const executorChurchPersonId = securityContext.churchPersonId;
    const executorFunctionalRoles = securityContext.functionalRoles || [];

    await this.hardDeleteUseCase.execute({
      processId,
      executorChurchPersonId,
      executorFunctionalRoles,
      confirmString: deleteInstruction.confirmString,
    }, churchId);

    return { message: 'El proceso ha sido eliminado permanentemente.' };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar información general y estado del proceso' })
  async updateProcess(
    @Param('id') id: string,
    @Body() dto: UpdateMentorshipProcessDto,
    @CurrentUser() securityContext: SecurityContext,
    @CurrentChurch() churchId: string,
  ): Promise<MentorshipResponseDto> {
    const result = await this.updateMentorshipUseCase.execute(
      id,
      dto,
      churchId,
      securityContext.churchPersonId,
      securityContext.functionalRoles || [],
    );
    return MentorshipResponseDto.fromEntity(result);
  }

  @Post(':id/participants')
  @ApiOperation({ summary: 'Invitar/Añadir un nuevo integrante al proceso' })
  async addParticipant(
    @Param('id') id: string,
    @Body() dto: Omit<AddParticipantToProcessDto, 'processId'>,
    @CurrentChurch() churchId: string,
  ): Promise<MentorshipResponseDto> {
    const result = await this.addParticipantUseCase.execute(
      { ...dto, processId: id },
      churchId,
    );
    return MentorshipResponseDto.fromEntity(result);
  }
}

