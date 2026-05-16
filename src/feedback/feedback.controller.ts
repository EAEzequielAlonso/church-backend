
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Query,
  Patch,
  Param,
  ForbiddenException,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { FeedbackQueryDto } from './dto/feedback-query.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SecurityContextGuard } from '../auth/guards/security-context.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AppPermission } from '../auth/authorization/permissions.enum';
import { CurrentUser, CurrentChurch } from '../common/decorators';
import { SubscriptionGuard } from '../subscriptions/guards/subscription.guard';

@Controller('feedback')
@UseGuards(JwtAuthGuard, SecurityContextGuard, PermissionsGuard, SubscriptionGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) { }

  @Post()
  async create(
    @Body() createFeedbackDto: CreateFeedbackDto,
    @CurrentUser() user: any,
    @CurrentChurch() churchId: string,
  ) {
    return this.feedbackService.create(createFeedbackDto, user.userId, churchId);
  }

  // Admin Only Endpoints
  @Get()
  @RequirePermissions(AppPermission.ROLE_MANAGE)
  async findAll(@Query() queryDto: FeedbackQueryDto) {
    return this.feedbackService.findAll(queryDto);
  }

  @Get('count-new')
  @RequirePermissions(AppPermission.ROLE_MANAGE)
  async countNew() {
    return this.feedbackService.countNew();
  }

  @Patch(':id')
  @RequirePermissions(AppPermission.ROLE_MANAGE)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateFeedbackDto,
  ) {
    return this.feedbackService.update(id, updateDto);
  }
}
