import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentChurch } from '../common/decorators';
import { TransactionType } from './enums/treasury.enums';

@Controller('treasury/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get('summary')
    async getSummary(
        @CurrentChurch() churchId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string
    ) {
        return this.reportsService.getSummary(churchId, startDate, endDate);
    }

    @Get('cashflow')
    async getCashflow(
        @CurrentChurch() churchId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string
    ) {
        return this.reportsService.getCashflow(churchId, startDate, endDate);
    }

    @Get('category-breakdown')
    async getCategoryBreakdown(
        @CurrentChurch() churchId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('type') type: TransactionType
    ) {
        return this.reportsService.getCategoryBreakdown(churchId, startDate, endDate, type);
    }

    @Get('ministry-breakdown')
    async getMinistryBreakdown(
        @CurrentChurch() churchId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string
    ) {
        return this.reportsService.getMinistryBreakdown(churchId, startDate, endDate);
    }

    @Get('account-balances')
    async getAccountBalances(@CurrentChurch() churchId: string) {
        return this.reportsService.getAccountBalances(churchId);
    }

    @Get('trends')
    async getTrends(
        @CurrentChurch() churchId: string,
        @Query('months') months: number
    ) {
        return this.reportsService.getTrendAnalysis(churchId, months || 12);
    }
}
