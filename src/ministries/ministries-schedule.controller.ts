import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AppPermission } from '../auth/authorization/permissions.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BulkCreateAssignmentsDto } from './dto/create-assignment.dto';
import { CurrentChurch, CurrentUser } from '../common/decorators';
import { SecurityContextGuard } from '../auth/guards/security-context.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { SecurityContext } from '../auth/security-context.interface';

import { GetMinistryAssignmentsUseCase } from './use-cases/get-ministry-assignments.use-case';
import { CreateMinistryAssignmentsUseCase } from './use-cases/create-ministry-assignments.use-case';
import { DeleteMinistryAssignmentUseCase } from './use-cases/delete-ministry-assignment.use-case';
import { RequirePermissions } from 'src/auth/decorators/require-permissions.decorator';

import { SubscriptionGuard } from '../subscriptions/guards/subscription.guard';

@Controller('ministries/:id/schedule')
@UseGuards(
  JwtAuthGuard,
  SecurityContextGuard,
  PermissionsGuard,
  SubscriptionGuard,
)
export class MinistriesScheduleController {
  constructor(
    private readonly getAssignmentsUseCase: GetMinistryAssignmentsUseCase,
    private readonly createAssignmentsUseCase: CreateMinistryAssignmentsUseCase,
    private readonly deleteAssignmentUseCase: DeleteMinistryAssignmentUseCase,
  ) {}

  @Get()
  @RequirePermissions(AppPermission.MINISTRY_VIEW)
  getSchedule(
    @Param('id') ministryId: string,
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
  ) {
    return this.getAssignmentsUseCase.execute(ministryId, fromDate, toDate);
  }

  @Post()
  @RequirePermissions(AppPermission.MINISTRY_MANAGE)
  createAssignments(
    @Param('id') ministryId: string,
    @CurrentUser() securityContext: SecurityContext,
    @CurrentChurch() churchId: string,
    @Body() body: BulkCreateAssignmentsDto,
  ) {
    return this.createAssignmentsUseCase.execute(
      ministryId,
      body.assignments,
      churchId,
      securityContext.personId,
      securityContext.systemRole,
      securityContext.functionalRoles?.[0], // Assuming the use case needs one or we pass the array if updated
    );
  }

  @Delete(':assignmentId')
  @RequirePermissions(AppPermission.MINISTRY_MANAGE)
  deleteAssignment(
    @Param('id') ministryId: string,
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() securityContext: SecurityContext,
    @CurrentChurch() churchId: string,
  ) {
    return this.deleteAssignmentUseCase.execute(
      ministryId,
      assignmentId,
      churchId,
      securityContext.personId,
      securityContext.systemRole,
      securityContext.functionalRoles?.[0],
    );
  }
}

