import {
  Controller, Get, Post, Body, Param, UseGuards, Query, Patch, Delete,
  StreamableFile, Res,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SecurityContextGuard } from '../../auth/guards/security-context.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { AppPermission } from '../../auth/authorization/permissions.enum';
import { Response } from 'express';
import { CurrentChurch } from '../../common/decorators';
import { CreateBudgetPeriodUseCase } from '../use-cases/create-budget-period.use-case';
import { GetBudgetPeriodsUseCase } from '../use-cases/get-budget-periods.use-case';
import { CreateBudgetAllocationUseCase } from '../use-cases/create-budget-allocation.use-case';
import { GetBudgetAllocationsUseCase } from '../use-cases/get-budget-allocations.use-case';
import { GetBudgetExecutionUseCase } from '../use-cases/get-budget-execution.use-case';
import { UpdateBudgetAllocationUseCase } from '../use-cases/update-budget-allocation.use-case';
import { DeleteBudgetAllocationUseCase } from '../use-cases/delete-budget-allocation.use-case';
import { UpdateBudgetPeriodUseCase } from '../use-cases/update-budget-period.use-case';
import { DeleteBudgetPeriodUseCase } from '../use-cases/delete-budget-period.use-case';
import { CreateBudgetPeriodDto } from '../dto/create-budget-period.dto';
import { CreateBudgetAllocationDto } from '../dto/create-budget-allocation.dto';
import { ExportBudgetToPptUseCase } from '../use-cases/export-budget-to-ppt.use-case';
import { ExportBudgetToPdfUseCase } from '../use-cases/export-budget-to-pdf.use-case';
import { SubscriptionGuard } from '../../subscriptions/guards/subscription.guard';

@Controller('budget')
@UseGuards(JwtAuthGuard, SecurityContextGuard, PermissionsGuard, SubscriptionGuard)
export class BudgetController {
  constructor(
    private readonly createBudgetPeriodUseCase: CreateBudgetPeriodUseCase,
    private readonly getBudgetPeriodsUseCase: GetBudgetPeriodsUseCase,
    private readonly createBudgetAllocationUseCase: CreateBudgetAllocationUseCase,
    private readonly getBudgetAllocationsUseCase: GetBudgetAllocationsUseCase,
    private readonly getBudgetExecutionUseCase: GetBudgetExecutionUseCase,
    private readonly updateBudgetAllocationUseCase: UpdateBudgetAllocationUseCase,
    private readonly deleteBudgetAllocationUseCase: DeleteBudgetAllocationUseCase,
    private readonly updateBudgetPeriodUseCase: UpdateBudgetPeriodUseCase,
    private readonly deleteBudgetPeriodUseCase: DeleteBudgetPeriodUseCase,
    private readonly exportBudgetToPptUseCase: ExportBudgetToPptUseCase,
    private readonly exportBudgetToPdfUseCase: ExportBudgetToPdfUseCase,
  ) {}

  @Post('periods')
  @RequirePermissions(AppPermission.FINANCE_MANAGE)
  async createPeriod(@CurrentChurch() churchId: string, @Body() dto: CreateBudgetPeriodDto) {
    return this.createBudgetPeriodUseCase.execute(dto, churchId);
  }

  @Get('periods')
  @RequirePermissions(AppPermission.FINANCE_VIEW)
  async getPeriods(@CurrentChurch() churchId: string, @Query('year') year?: number) {
    return this.getBudgetPeriodsUseCase.execute(churchId, year);
  }

  @Patch('periods/:id')
  @RequirePermissions(AppPermission.FINANCE_MANAGE)
  async updatePeriod(@CurrentChurch() churchId: string, @Param('id') id: string, @Body() dto: any) {
    return this.updateBudgetPeriodUseCase.execute(id, dto, churchId);
  }

  @Delete('periods/:id')
  @RequirePermissions(AppPermission.FINANCE_MANAGE)
  async deletePeriod(@CurrentChurch() churchId: string, @Param('id') id: string) {
    return this.deleteBudgetPeriodUseCase.execute(id, churchId);
  }

  @Get('periods/:id/export-ppt')
  @RequirePermissions(AppPermission.FINANCE_VIEW)
  async exportPpt(@CurrentChurch() churchId: string, @Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const buffer = await this.exportBudgetToPptUseCase.execute(churchId, id);
    res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'Content-Disposition': 'attachment; filename="Presupuesto.pptx"' });
    return new StreamableFile(buffer);
  }

  @Get('periods/:id/export-pdf')
  @RequirePermissions(AppPermission.FINANCE_VIEW)
  async exportPdf(@CurrentChurch() churchId: string, @Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const buffer = await this.exportBudgetToPdfUseCase.execute(churchId, id);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="Presupuesto.pdf"' });
    return new StreamableFile(buffer);
  }

  @Post('allocations')
  @RequirePermissions(AppPermission.FINANCE_MANAGE)
  async createAllocation(@CurrentChurch() churchId: string, @Body() dto: CreateBudgetAllocationDto) {
    return this.createBudgetAllocationUseCase.execute(dto, churchId);
  }

  @Get('allocations')
  @RequirePermissions(AppPermission.FINANCE_VIEW)
  async getAllocations(@CurrentChurch() churchId: string, @Query('periodId') periodId: string) {
    return this.getBudgetAllocationsUseCase.execute(churchId, periodId);
  }

  @Get('execution/:periodId')
  @RequirePermissions(AppPermission.FINANCE_VIEW)
  async getExecution(@CurrentChurch() churchId: string, @Param('periodId') periodId: string) {
    return this.getBudgetExecutionUseCase.execute(churchId, periodId);
  }

  @Patch('allocations/:id')
  @RequirePermissions(AppPermission.FINANCE_MANAGE)
  async updateAllocation(@CurrentChurch() churchId: string, @Param('id') id: string, @Body() dto: any) {
    return this.updateBudgetAllocationUseCase.execute(id, dto, churchId);
  }

  @Delete('allocations/:id')
  @RequirePermissions(AppPermission.FINANCE_MANAGE)
  async deleteAllocation(@CurrentChurch() churchId: string, @Param('id') id: string) {
    return this.deleteBudgetAllocationUseCase.execute(id, churchId);
  }
}
