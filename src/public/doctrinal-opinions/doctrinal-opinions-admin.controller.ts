import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { DoctrinalOpinionsService } from './doctrinal-opinions.service';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { SecurityContextGuard } from 'src/core/auth/guards/security-context.guard';
import { PermissionsGuard } from 'src/core/auth/guards/permissions.guard';
import { RequirePermissions } from 'src/core/auth/decorators/require-permissions.decorator';
import { AppPermission } from 'src/core/auth/authorization/permissions.enum';

@Controller('doctrinal-opinions/admin')
@UseGuards(JwtAuthGuard, SecurityContextGuard, PermissionsGuard)
@RequirePermissions(AppPermission.ROLE_MANAGE)
export class DoctrinalOpinionsAdminController {
  constructor(
    private readonly doctrinalOpinionsService: DoctrinalOpinionsService,
  ) {}

  @Get('church/:churchId')
  getChurchOpinions(
    @Req() req: any,
    @Query('filterPending') filterPending?: string,
  ) {
    const isPending = filterPending === 'true';
    return this.doctrinalOpinionsService.getChurchOpinionsForAdmin(
      req.securityContext.churchId,
      isPending,
    );
  }

  @Patch(':id/review')
  reviewOpinion(@Req() req: any, @Param('id') id: string) {
    return this.doctrinalOpinionsService.markAsReviewedByAdmin(
      id,
      req.securityContext.churchId,
    );
  }

  @Delete(':id')
  deleteOpinion(@Req() req: any, @Param('id') id: string) {
    return this.doctrinalOpinionsService.deleteOpinionAsAdmin(
      id,
      req.securityContext.churchId,
    );
  }
}
