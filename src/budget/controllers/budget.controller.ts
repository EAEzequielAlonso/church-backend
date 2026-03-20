import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  Request,
  Patch,
  Delete,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../auth/guards/roles.guard';
import { StreamableFile, Res } from '@nestjs/common';
import { Response } from 'express';
import { FunctionalRole } from '../../common/enums';
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

@Controller('budget')
@UseGuards(JwtAuthGuard, RolesGuard)
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
  ) { }

  // --- Periods ---

  @Post('periods')
  @Roles(FunctionalRole.TREASURER)
  async createPeriod(@Request() req, @Body() dto: CreateBudgetPeriodDto) {
    return this.createBudgetPeriodUseCase.execute(dto, req.user.churchId);
  }

  @Get('periods')
  @Roles(FunctionalRole.TREASURER, FunctionalRole.AUDITOR, FunctionalRole.ADMIN_CHURCH)
  async getPeriods(@Request() req, @Query('year') year?: number) {
    return this.getBudgetPeriodsUseCase.execute(req.user.churchId, year);
  }

  @Patch('periods/:id')
  @Roles(FunctionalRole.TREASURER)
  async updatePeriod(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.updateBudgetPeriodUseCase.execute(id, dto, req.user.churchId);
  }

  @Delete('periods/:id')
  @Roles(FunctionalRole.TREASURER)
  async deletePeriod(@Request() req, @Param('id') id: string) {
    return this.deleteBudgetPeriodUseCase.execute(id, req.user.churchId);
  }

  @Get('periods/:id/export-ppt')
  @Roles(FunctionalRole.TREASURER, FunctionalRole.AUDITOR, FunctionalRole.ADMIN_CHURCH)
  async exportPpt(
    @Request() req,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.exportBudgetToPptUseCase.execute(
      req.user.churchId,
      id,
    );
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="Presupuesto.pptx"`,
    });
    return new StreamableFile(buffer);
  }

  // --- Allocations ---

  @Post('allocations')
  @Roles(FunctionalRole.TREASURER)
  async createAllocation(
    @Request() req,
    @Body() dto: CreateBudgetAllocationDto,
  ) {
    return this.createBudgetAllocationUseCase.execute(dto, req.user.churchId);
  }

  @Get('allocations')
  @Roles(FunctionalRole.TREASURER, FunctionalRole.AUDITOR, FunctionalRole.ADMIN_CHURCH)
  async getAllocations(@Request() req, @Query('periodId') periodId: string) {
    return this.getBudgetAllocationsUseCase.execute(
      req.user.churchId,
      periodId,
    );
  }

  // --- Execution ---

  @Get('execution/:periodId')
  @Roles(FunctionalRole.TREASURER, FunctionalRole.AUDITOR, FunctionalRole.ADMIN_CHURCH)
  async getExecution(@Request() req, @Param('periodId') periodId: string) {
    return this.getBudgetExecutionUseCase.execute(req.user.churchId, periodId);
  }

  @Patch('allocations/:id')
  @Roles(FunctionalRole.TREASURER)
  async updateAllocation(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.updateBudgetAllocationUseCase.execute(
      id,
      dto,
      req.user.churchId,
    );
  }

  @Delete('allocations/:id')
  @Roles(FunctionalRole.TREASURER)
  async deleteAllocation(@Request() req, @Param('id') id: string) {
    return this.deleteBudgetAllocationUseCase.execute(id, req.user.churchId);
  }
}
