import { Controller, Get, Post, Body, Param, UseGuards, Query, Request, Patch, Delete } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../auth/guards/roles.guard';
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

@Controller('budget')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(FunctionalRole.TREASURER, FunctionalRole.ADMIN_CHURCH) // Strict RBAC
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
    ) { }

    // --- Periods ---

    @Post('periods')
    async createPeriod(@Request() req, @Body() dto: CreateBudgetPeriodDto) {
        return this.createBudgetPeriodUseCase.execute(dto, req.user.churchId);
    }

    @Get('periods')
    async getPeriods(@Request() req, @Query('year') year?: number) {
        return this.getBudgetPeriodsUseCase.execute(req.user.churchId, year);
    }

    @Patch('periods/:id')
    async updatePeriod(@Request() req, @Param('id') id: string, @Body() dto: any) {
        return this.updateBudgetPeriodUseCase.execute(id, dto, req.user.churchId);
    }

    @Delete('periods/:id')
    async deletePeriod(@Request() req, @Param('id') id: string) {
        return this.deleteBudgetPeriodUseCase.execute(id, req.user.churchId);
    }

    // --- Allocations ---

    @Post('allocations')
    async createAllocation(@Request() req, @Body() dto: CreateBudgetAllocationDto) {
        return this.createBudgetAllocationUseCase.execute(dto, req.user.churchId);
    }

    @Get('allocations')
    async getAllocations(@Request() req, @Query('periodId') periodId: string) {
        return this.getBudgetAllocationsUseCase.execute(req.user.churchId, periodId);
    }

    // --- Execution ---

    @Get('execution/:periodId')
    async getExecution(@Request() req, @Param('periodId') periodId: string) {
        return this.getBudgetExecutionUseCase.execute(req.user.churchId, periodId);
    }

    @Patch('allocations/:id')
    async updateAllocation(@Request() req, @Param('id') id: string, @Body() dto: any) {
        return this.updateBudgetAllocationUseCase.execute(id, dto, req.user.churchId);
    }

    @Delete('allocations/:id')
    async deleteAllocation(@Request() req, @Param('id') id: string) {
        return this.deleteBudgetAllocationUseCase.execute(id, req.user.churchId);
    }
}
