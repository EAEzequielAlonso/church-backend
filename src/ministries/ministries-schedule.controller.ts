import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MinistriesService } from './ministries.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AppPermission } from '../auth/authorization/permissions.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BulkCreateAssignmentsDto } from './dto/create-assignment.dto';

@Controller('ministries/:id/schedule')
@UseGuards(JwtAuthGuard)
export class MinistriesScheduleController {
  constructor(private readonly ministriesService: MinistriesService) {}

  @Get()
  @RequirePermissions(AppPermission.MINISTRY_VIEW)
  getSchedule(
    @Param('id') ministryId: string,
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
  ) {
    return this.ministriesService.getAssignments(ministryId, fromDate, toDate);
  }

  @Post()
  @RequirePermissions(AppPermission.MINISTRY_MANAGE)
  createAssignments(
    @Param('id') ministryId: string,
    @Body() body: BulkCreateAssignmentsDto,
  ) {
    return this.ministriesService.createAssignments(
      ministryId,
      body.assignments,
    );
  }

  @Delete(':assignmentId')
  @RequirePermissions(AppPermission.MINISTRY_MANAGE)
  deleteAssignment(
    @Param('id') ministryId: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.ministriesService.deleteAssignment(ministryId, assignmentId);
  }
}
