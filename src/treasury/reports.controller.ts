import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SecurityContextGuard } from '../auth/guards/security-context.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AppPermission } from '../auth/authorization/permissions.enum';
import { CurrentChurch } from '../common/decorators';
import { TransactionType } from './enums/treasury.enums';

import { GetSummaryUseCase } from './use-cases/get-summary.use-case';
import { GetCashflowUseCase } from './use-cases/get-cashflow.use-case';
import { GetCategoryBreakdownUseCase } from './use-cases/get-category-breakdown.use-case';
import { GetMinistryBreakdownUseCase } from './use-cases/get-ministry-breakdown.use-case';
import { GetAccountBalancesUseCase } from './use-cases/get-account-balances.use-case';
import { GetTrendAnalysisUseCase } from './use-cases/get-trend-analysis.use-case';

import { SubscriptionGuard } from '../subscriptions/guards/subscription.guard';
@Controller('treasury/reports')
@UseGuards(JwtAuthGuard, SecurityContextGuard, PermissionsGuard, SubscriptionGuard)
export class ReportsController {
  constructor(
    private readonly getSummaryUseCase: GetSummaryUseCase,
    private readonly getCashflowUseCase: GetCashflowUseCase,
    private readonly getCategoryBreakdownUseCase: GetCategoryBreakdownUseCase,
    private readonly getMinistryBreakdownUseCase: GetMinistryBreakdownUseCase,
    private readonly getAccountBalancesUseCase: GetAccountBalancesUseCase,
    private readonly getTrendAnalysisUseCase: GetTrendAnalysisUseCase,
  ) {}

  @Get('summary')
  @RequirePermissions(AppPermission.FINANCE_VIEW)
  getSummary(
    @CurrentChurch() churchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.getSummaryUseCase.execute(churchId, startDate, endDate);
  }

  @Get('cashflow')
  @RequirePermissions(AppPermission.FINANCE_VIEW)
  getCashflow(
    @CurrentChurch() churchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.getCashflowUseCase.execute(churchId, startDate, endDate);
  }

  @Get('category-breakdown')
  @RequirePermissions(AppPermission.FINANCE_VIEW)
  getCategoryBreakdown(
    @CurrentChurch() churchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('type') type: TransactionType,
  ) {
    return this.getCategoryBreakdownUseCase.execute(
      churchId,
      startDate,
      endDate,
      type,
    );
  }

  @Get('ministry-breakdown')
  @RequirePermissions(AppPermission.FINANCE_VIEW)
  getMinistryBreakdown(
    @CurrentChurch() churchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.getMinistryBreakdownUseCase.execute(
      churchId,
      startDate,
      endDate,
    );
  }

  @Get('account-balances')
  @RequirePermissions(AppPermission.FINANCE_VIEW)
  getAccountBalances(@CurrentChurch() churchId: string) {
    return this.getAccountBalancesUseCase.execute(churchId);
  }

  @Get('trends')
  @RequirePermissions(AppPermission.FINANCE_VIEW)
  getTrends(
    @CurrentChurch() churchId: string,
    @Query('months') months: number,
  ) {
    return this.getTrendAnalysisUseCase.execute(churchId, months || 12);
  }
}


