
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
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CurrentUser, CurrentChurch } from '../common/decorators';
import { SystemRole } from '../common/enums';
import { SubscriptionGuard } from '../subscriptions/guards/subscription.guard';

@Controller('feedback')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
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
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN_APP)
  async findAll(@Query() queryDto: FeedbackQueryDto) {
    return this.feedbackService.findAll(queryDto);
  }

  @Get('count-new')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN_APP)
  async countNew() {
    return this.feedbackService.countNew();
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN_APP)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateFeedbackDto,
  ) {
    return this.feedbackService.update(id, updateDto);
  }
}
