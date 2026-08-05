import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { SecurityContextGuard } from '../../../core/auth/guards/security-context.guard';
import { PermissionsGuard } from '../../../core/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../core/auth/decorators/require-permissions.decorator';
import { AppPermission } from '../../../core/auth/authorization/permissions.enum';
import { ChurchClaimsService } from '../services/church-claims.service';
import { ApproveChurchClaimUseCase } from '../use-cases/church-claims/approve-church-claim.use-case';
import { RejectChurchClaimUseCase } from '../use-cases/church-claims/reject-church-claim.use-case';
import { ChurchLifecycleService } from '../church-profile/services/church-lifecycle.service';
import { AdminPendingClaimDto } from '../dto/church-claim/admin-pending-claim.dto';
import { RejectChurchClaimDto } from '../dto/church-claim/reject-church-claim.dto';

@ApiTags('Public Claims Admin')
@ApiBearerAuth()
@Controller('public/admin/claims')
@UseGuards(JwtAuthGuard, SecurityContextGuard, PermissionsGuard)
@RequirePermissions(AppPermission.NETWORK_ADMINISTRATION)
export class ChurchClaimsAdminController {
  constructor(
    private readonly service: ChurchClaimsService,
    private readonly approveUseCase: ApproveChurchClaimUseCase,
    private readonly rejectUseCase: RejectChurchClaimUseCase,
    private readonly lifecycleService: ChurchLifecycleService,
  ) {}

  @Get('pending')
  @ApiOperation({ summary: 'List pending public church claims' })
  @ApiResponse({ status: 200, type: [AdminPendingClaimDto] })
  pending(): Promise<AdminPendingClaimDto[]> {
    return this.service.pendingClaims();
  }

  @Post(':id/approve')
  @ApiOperation({
    summary: 'Approve a public church claim and assign church ownership',
  })
  approve(@Param('id') id: string) {
    return this.approveUseCase.execute(id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a public church claim' })
  reject(@Param('id') id: string, @Body() dto: RejectChurchClaimDto) {
    return this.rejectUseCase.execute(id, dto.notes);
  }

  @Post('verify-church/:churchId')
  @ApiOperation({
    summary: 'Manually verify an unverified church (without a claim)',
  })
  verifyChurch(@Param('churchId') churchId: string) {
    return this.lifecycleService.transitionState(churchId);
  }
}
