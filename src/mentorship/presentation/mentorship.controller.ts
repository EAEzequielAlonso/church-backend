import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { CurrentChurch } from '../../common/decorators';
import { AppPermission } from '../../auth/authorization/permissions.enum';
import { Inject } from '@nestjs/common';
import { MENTORSHIP_REPOSITORY_TOKEN } from '../domain/constants/injection-tokens';

import { MentorshipResponseDto } from '../application/dto/mentorship-response.dto';
import { IMentorshipProcessRepository } from '../domain/repositories/mentorship-process.repository.interface';

// DTOs de Use Cases
import { CreateMentorshipProcessDto } from '../application/dto/create-mentorship-process.dto';
import {
  AddMeetingDto,
  AddNoteDto,
  AddTaskDto,
} from '../application/dto/mentorship-content.dto';
import { HardDeleteMentorshipProcessDto } from '../application/dto/hard-delete-mentorship.dto';

// Use Cases
import { CreateMentorshipProcessUseCase } from '../application/use-cases/create-mentorship-process.use-case';
import { AddMeetingUseCase } from '../application/use-cases/add-meeting.use-case';
import { AddNoteUseCase } from '../application/use-cases/add-note.use-case';
import { AddTaskUseCase } from '../application/use-cases/add-task.use-case';
import { HardDeleteMentorshipProcessUseCase } from '../application/use-cases/hard-delete-mentorship.use-case';
import { GetMentorshipsUseCase } from '../application/use-cases/get-mentorships.use-case';
import { GetMentorshipByIdUseCase } from '../application/use-cases/get-mentorship-by-id.use-case';
import { GetMentorshipsDto } from '../application/dto/get-mentorships.dto';

@ApiTags('Mentorship')
@Controller('mentorship')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class MentorshipController {
  constructor(
    private readonly createUseCase: CreateMentorshipProcessUseCase,
    private readonly addMeetingUseCase: AddMeetingUseCase,
    private readonly addNoteUseCase: AddNoteUseCase,
    private readonly addTaskUseCase: AddTaskUseCase,
    private readonly hardDeleteUseCase: HardDeleteMentorshipProcessUseCase,
    private readonly getMentorshipsUseCase: GetMentorshipsUseCase,
    private readonly getMentorshipByIdUseCase: GetMentorshipByIdUseCase,
    @Inject(MENTORSHIP_REPOSITORY_TOKEN)
    private readonly repository: IMentorshipProcessRepository,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Crear un nuevo proceso de mentoría (Discipulado o Consejería)',
  })
  async createProcess(
    @CurrentChurch() churchId: string,
    @Body() createDto: Omit<CreateMentorshipProcessDto, 'churchId'>,
    @Request() req,
  ): Promise<MentorshipResponseDto> {
    // El controlador cede la orquestación pura al Use Case
    const result = await this.createUseCase.execute(
      { ...createDto, churchId },
      req.user?.functionalRoles || [],
      req.user?.memberId,
    );

    // Retorna el DTO purificado, jamás la Entidad TypeORM
    return MentorshipResponseDto.fromEntity(result);
  }

  @Get()
  @ApiOperation({ summary: 'Listar procesos de mentoría paginados' })
  async getMentorships(
    @CurrentChurch() churchId: string,
    @Query() query: GetMentorshipsDto,
    @Request() req,
  ): Promise<{ data: MentorshipResponseDto[]; total: number }> {
    return this.getMentorshipsUseCase.execute(
      churchId,
      query,
      req.user?.memberId,
      req.user?.permissions, // Dependiendo del AuthGuard, provee array de AppPermission
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener proceso de mentoría por ID' })
  async getProcess(
    @CurrentChurch() churchId: string,
    @Param('id') id: string,
    @Request() req,
  ): Promise<MentorshipResponseDto> {
    return this.getMentorshipByIdUseCase.execute(
      churchId,
      id,
      req.user?.memberId,
      req.user?.permissions,
    );
  }

  @Post(':id/meetings')
  @RequirePermissions(AppPermission.COUNSELING_UPDATE)
  @ApiOperation({ summary: 'Añadir un encuentro a un proceso' })
  async addMeeting(
    @Param('id') processId: string,
    @Body() dto: Omit<AddMeetingDto, 'processId'>,
  ): Promise<MentorshipResponseDto> {
    const result = await this.addMeetingUseCase.execute({ ...dto, processId });
    return MentorshipResponseDto.fromEntity(result);
  }

  @Post(':id/notes')
  @RequirePermissions(AppPermission.COUNSELING_UPDATE)
  @ApiOperation({ summary: 'Añadir una nota a un proceso' })
  async addNote(
    @Param('id') processId: string,
    @Body() dto: Omit<AddNoteDto, 'processId'>,
  ): Promise<MentorshipResponseDto> {
    const result = await this.addNoteUseCase.execute({ ...dto, processId });
    return MentorshipResponseDto.fromEntity(result);
  }

  @Post(':id/tasks')
  @RequirePermissions(AppPermission.COUNSELING_UPDATE)
  @ApiOperation({ summary: 'Añadir una tarea a un proceso' })
  async addTask(
    @Param('id') processId: string,
    @Body() dto: Omit<AddTaskDto, 'processId'>,
  ): Promise<MentorshipResponseDto> {
    const result = await this.addTaskUseCase.execute({ ...dto, processId });
    return MentorshipResponseDto.fromEntity(result);
  }

  @Delete(':id')
  @RequirePermissions(AppPermission.COUNSELING_DELETE)
  @ApiOperation({ summary: 'Eliminar físicamente un proceso en cascada' })
  async hardDelete(
    @Param('id') processId: string,
    @Body() deleteInstruction: { confirmString: string },
    @Request() req,
  ): Promise<{ message: string }> {
    const executorChurchPersonId = req.user?.memberId; // Depende de cómo mapée Auth
    const executorFunctionalRoles = req.user?.functionalRoles || [];

    await this.hardDeleteUseCase.execute({
      processId,
      executorChurchPersonId,
      executorFunctionalRoles,
      confirmString: deleteInstruction.confirmString,
    });

    return { message: 'El proceso ha sido eliminado permanentemente.' };
  }
}
