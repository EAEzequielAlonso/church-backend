import { Controller, Get, Post, Body, UseGuards, Query, Patch, Param, Delete } from '@nestjs/common';
import { TreasuryService } from './treasury.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CurrentChurch, CurrentUser } from '../common/decorators';
import { User } from '../users/entities/user.entity';
import { FunctionalRole } from '../common/enums'; // STRICT RBAC

import { ReportsService } from './reports.service';
import { Response } from 'express';
import { Res } from '@nestjs/common';

// Use Cases
import { CreateTransactionUseCase } from './use-cases/create-transaction.use-case';
import { UpdateTransactionUseCase } from './use-cases/update-transaction.use-case';
import { DeleteTransactionUseCase } from './use-cases/delete-transaction.use-case';
import { GetTransactionsUseCase, GetTransactionsFilterDto } from './use-cases/get-transactions.use-case';
import { GetAuditLogsUseCase } from './use-cases/get-audit-logs.use-case';
import { GetAccountBalancesUseCase } from './use-cases/get-account-balances.use-case';

@Controller('treasury')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TreasuryController {
    constructor(
        private readonly treasuryService: TreasuryService,
        private readonly reportsService: ReportsService,

        // Injected Use Cases
        private readonly createTransactionUseCase: CreateTransactionUseCase,
        private readonly updateTransactionUseCase: UpdateTransactionUseCase,
        private readonly deleteTransactionUseCase: DeleteTransactionUseCase,
        private readonly getTransactionsUseCase: GetTransactionsUseCase,
        private readonly getAuditLogsUseCase: GetAuditLogsUseCase,
        private readonly getAccountBalancesUseCase: GetAccountBalancesUseCase
    ) { }

    // --- TRANSACTION ENDPOINTS (Refactored) ---

    @Post('transactions')
    @Roles(FunctionalRole.TREASURER)
    createTransaction(@Body() data: any, @CurrentChurch() churchId: string, @CurrentUser() user: any) {
        return this.createTransactionUseCase.execute({
            ...data,
            churchId,
            userId: user.userId
        });
    }

    @Get('transactions')
    @Roles(FunctionalRole.TREASURER, FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR) // READ: Broader Access
    getTransactions(
        @CurrentChurch() churchId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('type') type?: string,
        @Query('categoryId') categoryId?: string,
        @Query('accountId') accountId?: string,
        @Query('limit') limit?: number,
        @Query('page') page?: number,
        @Query('deleted') deleted?: string
    ) {
        const validatedLimit = limit ? Number(limit) : 10;
        const validatedPage = page ? Number(page) : 1;
        const offset = (validatedPage - 1) * validatedLimit;

        const filters: GetTransactionsFilterDto = {
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            type,
            categoryId,
            accountId,
            limit: validatedLimit,
            offset,
            withDeleted: deleted === 'true'
        };
        console.log('GET /transactions filters:', filters, 'Original params:', { startDate, endDate });
        return this.getTransactionsUseCase.execute(churchId, filters);
    }

    @Patch('transactions/:id')
    @Roles(FunctionalRole.TREASURER)
    updateTransaction(@Param('id') id: string, @Body() data: any, @CurrentChurch() churchId: string, @CurrentUser() user: any) {
        return this.updateTransactionUseCase.execute({
            id,
            churchId,
            userId: user.userId,
            ...data
        });
    }

    @Get('transactions/:id/audit')
    @Roles(FunctionalRole.TREASURER, FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR)
    getAuditLogs(@Param('id') id: string) {
        return this.getAuditLogsUseCase.execute(id);
    }

    @Delete('transactions/:id')
    @Roles(FunctionalRole.TREASURER)
    deleteTransaction(@Param('id') id: string, @CurrentChurch() churchId: string, @CurrentUser() user: any) {
        console.log('[DEBUG-TreasuryController] User object structure:', user);
        return this.deleteTransactionUseCase.execute(id, churchId, user.userId || user.id); // Try both to be safe while debugging
    }

    // --- REPORTS ---

    @Get('reports/ppt')
    @Roles(FunctionalRole.TREASURER, FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR)
    async getPPTReport(@CurrentChurch() churchId: string, @Res() res: Response) {
        const { data: transactions } = await this.getTransactionsUseCase.execute(churchId); // Use UseCase
        const accounts = await this.treasuryService.findAllAccounts(churchId);

        const buffer = await this.reportsService.generateMonthlyReport('Iglesia', transactions, accounts);

        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'Content-Disposition': 'attachment; filename=reporte-mensual.pptx',
            'Content-Length': buffer.length.toString(), // toString() often safer
        });

        res.end(buffer);
    }

    // --- ACCOUNTS (Legacy Delegate) ---
    // Note: Accounts management typically Treasurer only
    @Post('accounts')
    @Roles(FunctionalRole.TREASURER)
    createAccount(@Body() data: any, @CurrentChurch() churchId: string) {
        return this.treasuryService.createAccount(data, churchId);
    }

    @Patch('accounts/:id')
    @Roles(FunctionalRole.TREASURER)
    updateAccount(@Param('id') id: string, @Body() data: any) {
        return this.treasuryService.updateAccount(id, data);
    }

    @Delete('accounts/:id')
    @Roles(FunctionalRole.TREASURER)
    deleteAccount(@Param('id') id: string) {
        return this.treasuryService.deleteAccount(id);
    }

    @Get('accounts')
    @Roles(FunctionalRole.TREASURER, FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR)
    getAccounts(@CurrentChurch() churchId: string) {
        return this.getAccountBalancesUseCase.execute(churchId);
    }

    // --- BUDGETS (Legacy Delegate) ---
    @Post('budgets')
    @Roles(FunctionalRole.TREASURER)
    createBudget(@Body() data: any, @CurrentChurch() churchId: string) {
        return this.treasuryService.createBudget(data, churchId);
    }

    @Get('budgets')
    @Roles(FunctionalRole.TREASURER, FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR)
    getBudgets(@CurrentChurch() churchId: string, @Query('year') year?: number) {
        return this.treasuryService.getBudgets(churchId, year);
    }

    @Delete('budgets/:id')
    @Roles(FunctionalRole.TREASURER)
    deleteBudget(@Param('id') id: string) {
        return this.treasuryService.deleteBudget(id);
    }
    // --- CATEGORIES (New Endpoints) ---

    @Post('categories')
    @Roles(FunctionalRole.TREASURER)
    createCategory(@Body() data: any, @CurrentChurch() churchId: string) {
        return this.treasuryService.createCategory(data, churchId);
    }

    @Get('categories')
    @Roles(FunctionalRole.TREASURER, FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR)
    getCategories(@CurrentChurch() churchId: string, @Query('type') type?: string) {
        return this.treasuryService.findAllCategories(churchId, type);
    }

    @Patch('categories/:id')
    @Roles(FunctionalRole.TREASURER)
    updateCategory(@Param('id') id: string, @Body() data: any) {
        return this.treasuryService.updateCategory(id, data);
    }

    @Delete('categories/:id')
    @Roles(FunctionalRole.TREASURER)
    deleteCategory(@Param('id') id: string) {
        return this.treasuryService.deleteCategory(id);
    }
}
