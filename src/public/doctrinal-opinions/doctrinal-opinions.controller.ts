import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { DoctrinalOpinionsService } from './doctrinal-opinions.service';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { CreateOrUpdateDoctrinalOpinionDto } from './dto/create-or-update-doctrinal-opinion.dto';
import { CurrentUser } from 'src/common/decorators';
import { SecurityContext } from 'src/core/auth/security-context.interface';
import { SecurityContextGuard } from 'src/core/auth/guards/security-context.guard';
@Controller('doctrinal-opinions')
@UseGuards(JwtAuthGuard, SecurityContextGuard)
export class DoctrinalOpinionsController {
  constructor(
    private readonly doctrinalOpinionsService: DoctrinalOpinionsService,
  ) {}

  @Post('church/:churchId')
  createOrUpdateOpinion(
    @CurrentUser() context: SecurityContext,
    @Param('churchId') churchId: string,
    @Body() dto: CreateOrUpdateDoctrinalOpinionDto,
  ) {
    if (!context.personId) throw new Error('Person ID is required');
    return this.doctrinalOpinionsService.createOrUpdateOpinion(
      context.personId,
      churchId,
      dto,
    );
  }

  @Get('church/:churchId/my')
  getMyOpinion(@CurrentUser() context: SecurityContext, @Param('churchId') churchId: string) {
    if (!context.personId) throw new Error('Person ID is required');
    return this.doctrinalOpinionsService.getMyOpinion(context.personId, churchId);
  }

  @Delete('church/:churchId/my')
  deleteMyOpinion(@CurrentUser() context: SecurityContext, @Param('churchId') churchId: string) {
    if (!context.personId) throw new Error('Person ID is required');
    return this.doctrinalOpinionsService.deleteMyOpinion(context.personId, churchId);
  }

  @Get('my')
  getMyOpinions(@CurrentUser() context: SecurityContext) {
    if (!context.personId) throw new Error('Person ID is required');
    return this.doctrinalOpinionsService.getMyOpinions(context.personId);
  }
}
