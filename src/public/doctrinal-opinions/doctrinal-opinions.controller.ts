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

@Controller('doctrinal-opinions')
@UseGuards(JwtAuthGuard)
export class DoctrinalOpinionsController {
  constructor(
    private readonly doctrinalOpinionsService: DoctrinalOpinionsService,
  ) {}

  @Post('church/:churchId')
  createOrUpdateOpinion(
    @Req() req: any,
    @Param('churchId') churchId: string,
    @Body() dto: CreateOrUpdateDoctrinalOpinionDto,
  ) {
    return this.doctrinalOpinionsService.createOrUpdateOpinion(
      req.user.id,
      churchId,
      dto,
    );
  }

  @Get('church/:churchId/my')
  getMyOpinion(@Req() req: any, @Param('churchId') churchId: string) {
    return this.doctrinalOpinionsService.getMyOpinion(req.user.id, churchId);
  }

  @Delete('church/:churchId/my')
  deleteMyOpinion(@Req() req: any, @Param('churchId') churchId: string) {
    return this.doctrinalOpinionsService.deleteMyOpinion(req.user.id, churchId);
  }
}
