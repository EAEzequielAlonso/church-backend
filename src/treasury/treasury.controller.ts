import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Query,
  Patch,
  Param,
  Delete,
  Req,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CurrentChurch, CurrentUser } from '../common/decorators';
import { FunctionalRole } from '../common/enums';

import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';

import { ReportsService } from './reports.service';
import { Response, Request } from 'express';
import { Res } from '@nestjs/common';

// Use Cases — Transactions
import { CreateTransactionUseCase } from './use-cases/create-transaction.use-case';
import { UpdateTransactionUseCase } from './use-cases/update-transaction.use-case';
import { DeleteTransactionUseCase } from './use-cases/delete-transaction.use-case';
import { CorrectTransactionUseCase } from './use-cases/correct-transaction.use-case';
import {
  GetTransactionsUseCase,
  GetTransactionsFilterDto,
} from './use-cases/get-transactions.use-case';
import { GetAuditLogsUseCase } from './use-cases/get-audit-logs.use-case';

// Use Cases — Accounts
import { CreateAccountUseCase } from './use-cases/create-account.use-case';
import { GetAccountsUseCase } from './use-cases/get-accounts.use-case';
import { UpdateAccountUseCase } from './use-cases/update-account.use-case';
import { DeleteAccountUseCase } from './use-cases/delete-account.use-case';

// Use Cases — Categories
import { CreateCategoryUseCase } from './use-cases/create-category.use-case';
import { GetCategoriesUseCase } from './use-cases/get-categories.use-case';
import { UpdateCategoryUseCase } from './use-cases/update-category.use-case';
import { DeleteCategoryUseCase } from './use-cases/delete-category.use-case';



// Use Cases — Periods
import { ClosePeriodUseCase } from './use-cases/close-period.use-case';
import { ReopenPeriodUseCase } from './use-cases/reopen-period.use-case';
import { GetPeriodStatusUseCase } from './use-cases/get-period-status.use-case';

// Entities for querying periods
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClosedPeriod } from './entities/closed-period.entity';
import { AuditEntityType, AuditAction } from './enums/treasury.enums';

@Controller('treasury')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class TreasuryController {
  constructor(
    private readonly reportsService: ReportsService,

    // Transactions
    private readonly createTransactionUseCase: CreateTransactionUseCase,
    private readonly updateTransactionUseCase: UpdateTransactionUseCase,
    private readonly deleteTransactionUseCase: DeleteTransactionUseCase,
    private readonly correctTransactionUseCase: CorrectTransactionUseCase,
    private readonly getTransactionsUseCase: GetTransactionsUseCase,
    private readonly getAuditLogsUseCase: GetAuditLogsUseCase,

    // Accounts
    private readonly createAccountUseCase: CreateAccountUseCase,
    private readonly getAccountsUseCase: GetAccountsUseCase,
    private readonly updateAccountUseCase: UpdateAccountUseCase,
    private readonly deleteAccountUseCase: DeleteAccountUseCase,

    // Categories
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly getCategoriesUseCase: GetCategoriesUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
    private readonly deleteCategoryUseCase: DeleteCategoryUseCase,



    // Periods
    private readonly closePeriodUseCase: ClosePeriodUseCase,
    private readonly reopenPeriodUseCase: ReopenPeriodUseCase,
    private readonly getPeriodStatusUseCase: GetPeriodStatusUseCase,
    @InjectRepository(ClosedPeriod)
    private readonly closedPeriodRepo: Repository<ClosedPeriod>,
  ) { }

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('transactions')
  @Roles(FunctionalRole.TREASURER)
  createTransaction(
    @Body() data: any,
    @CurrentChurch() churchId: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.createTransactionUseCase.execute({
      ...data,
      churchId,
      userId: user.userId,
      userRole: user.functionalRole,
      userEmail: user.email,
      ipAddress: req.ip || req.socket?.remoteAddress || null,
    });
  }

  @Get('transactions')
  @Roles(
    FunctionalRole.TREASURER,
    FunctionalRole.ADMIN_CHURCH,
    FunctionalRole.AUDITOR,
  )
  getTransactions(
    @CurrentChurch() churchId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
    @Query('accountId') accountId?: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @Query('deleted') deleted?: string,
    @Query('includeHistory') includeHistory?: string,
  ) {
    const validatedLimit = limit ? Number(limit) : 10;
    const validatedPage = page ? Number(page) : 1;
    const offset = (validatedPage - 1) * validatedLimit;

    const filters: GetTransactionsFilterDto = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      type,
      status,
      categoryId,
      accountId,
      limit: validatedLimit,
      offset,
      withDeleted: deleted === 'true',
      includeHistory: includeHistory === 'true',
    };
    return this.getTransactionsUseCase.execute(churchId, filters);
  }

  @Patch('transactions/:id')
  @Roles(FunctionalRole.TREASURER)
  updateTransaction(
    @Param('id') id: string,
    @Body() data: any,
    @CurrentChurch() churchId: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.updateTransactionUseCase.execute({
      id,
      churchId,
      userId: user.userId,
      userRole: user.functionalRole,
      userEmail: user.email,
      ipAddress: req.ip || req.socket?.remoteAddress || null,
      ...data,
    });
  }

  @Get('audit')
  @Roles(
    FunctionalRole.TREASURER,
    FunctionalRole.ADMIN_CHURCH,
    FunctionalRole.AUDITOR,
  )
  getAuditLogs(
    @CurrentChurch() churchId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('entityId') entityId?: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
  ) {
    const validatedLimit = limit ? Number(limit) : 20;
    const validatedPage = page ? Number(page) : 1;
    const offset = (validatedPage - 1) * validatedLimit;

    return this.getAuditLogsUseCase.execute(churchId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      entityType: entityType as AuditEntityType,
      action: action as AuditAction,
      userId,
      entityId,
      limit: validatedLimit,
      offset,
    });
  }

  @Delete('transactions/:id')
  @Roles(FunctionalRole.TREASURER)
  deleteTransaction(
    @Param('id') id: string,
    @CurrentChurch() churchId: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.deleteTransactionUseCase.execute(
      id,
      churchId,
      user.userId || user.id,
      user.functionalRole,
      user.email,
      req.ip || req.socket?.remoteAddress || null,
    );
  }

  @Post('transactions/:id/correct')
  @Roles(FunctionalRole.TREASURER)
  correctTransaction(
    @Param('id') id: string,
    @Body() data: { reason: string; newAmount?: number; newSourceAccountId?: string; newDestinationAccountId?: string; newCategoryId?: string; newDescription?: string },
    @CurrentChurch() churchId: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.correctTransactionUseCase.execute({
      transactionId: id,
      churchId,
      userId: user.userId || user.id,
      userRole: user.functionalRole,
      userEmail: user.email,
      ipAddress: req.ip || req.socket?.remoteAddress || null,
      ...data,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORTS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('reports/ppt')
  @Roles(
    FunctionalRole.TREASURER,
    FunctionalRole.ADMIN_CHURCH,
    FunctionalRole.AUDITOR,
  )
  async getPPTReport(@CurrentChurch() churchId: string, @Res() res: Response) {
    const { data: transactions } =
      await this.getTransactionsUseCase.execute(churchId);
    const accounts = await this.getAccountsUseCase.execute(churchId);

    const buffer = await this.reportsService.generateMonthlyReport(
      'Iglesia',
      transactions,
      accounts,
    );

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': 'attachment; filename=reporte-mensual.pptx',
      'Content-Length': buffer.length.toString(),
    });

    res.end(buffer);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCOUNTS
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('accounts')
  @Roles(FunctionalRole.TREASURER)
  createAccount(
    @Body() dto: CreateAccountDto,
    @CurrentChurch() churchId: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.createAccountUseCase.execute(
      dto, churchId,
      user.userId || user.id,
      user.functionalRole,
      user.email,
      req.ip || req.socket?.remoteAddress || null,
    );
  }

  @Get('accounts')
  @Roles(
    FunctionalRole.TREASURER,
    FunctionalRole.ADMIN_CHURCH,
    FunctionalRole.AUDITOR,
  )
  getAccounts(@CurrentChurch() churchId: string) {
    return this.getAccountsUseCase.execute(churchId);
  }

  @Patch('accounts/:id')
  @Roles(FunctionalRole.TREASURER)
  updateAccount(
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
    @CurrentChurch() churchId: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.updateAccountUseCase.execute(
      id, churchId, dto,
      user.userId || user.id,
      user.functionalRole,
      user.email,
      req.ip || req.socket?.remoteAddress || null,
    );
  }

  @Delete('accounts/:id')
  @Roles(FunctionalRole.TREASURER)
  deleteAccount(
    @Param('id') id: string,
    @CurrentChurch() churchId: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.deleteAccountUseCase.execute(
      id, churchId,
      user.userId || user.id,
      user.functionalRole,
      user.email,
      req.ip || req.socket?.remoteAddress || null,
    );
  }



  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORIES
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('categories')
  @Roles(FunctionalRole.TREASURER)
  createCategory(
    @Body() dto: CreateCategoryDto,
    @CurrentChurch() churchId: string,
  ) {
    return this.createCategoryUseCase.execute(dto, churchId);
  }

  @Get('categories')
  @Roles(
    FunctionalRole.TREASURER,
    FunctionalRole.ADMIN_CHURCH,
    FunctionalRole.AUDITOR,
  )
  getCategories(
    @CurrentChurch() churchId: string,
    @Query('type') type?: string,
  ) {
    return this.getCategoriesUseCase.execute(churchId, type);
  }

  @Patch('categories/:id')
  @Roles(FunctionalRole.TREASURER)
  updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentChurch() churchId: string,
  ) {
    return this.updateCategoryUseCase.execute(id, churchId, dto);
  }

  @Delete('categories/:id')
  @Roles(FunctionalRole.TREASURER)
  deleteCategory(
    @Param('id') id: string,
    @CurrentChurch() churchId: string,
  ) {
    return this.deleteCategoryUseCase.execute(id, churchId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PERIODS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('periods/status')
  @Roles(FunctionalRole.TREASURER, FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR)
  getPeriodStatus(
    @CurrentChurch() churchId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.getPeriodStatusUseCase.execute(churchId, parseInt(year, 10), parseInt(month, 10));
  }

  @Post('periods/close')
  @Roles(FunctionalRole.TREASURER)
  closePeriod(
    @Body() data: { year: number; month: number },
    @CurrentChurch() churchId: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.closePeriodUseCase.execute({
      churchId,
      userId: user.userId || user.id,
      userRole: user.functionalRole,
      userEmail: user.email,
      ipAddress: req.ip || req.socket?.remoteAddress || null,
      year: data.year,
      month: data.month,
    });
  }

  @Post('periods/:year/:month/reopen')
  @Roles(FunctionalRole.ADMIN_CHURCH)
  reopenPeriod(
    @Param('year') year: string,
    @Param('month') month: string,
    @Body() data: { reason: string },
    @CurrentChurch() churchId: string,
    @CurrentUser() user: any,
  ) {
    return this.reopenPeriodUseCase.execute({
      churchId,
      userId: user.userId || user.id,
      year: parseInt(year, 10),
      month: parseInt(month, 10),
      reason: data.reason,
    });
  }

  @Get('periods')
  @Roles(
    FunctionalRole.TREASURER,
    FunctionalRole.ADMIN_CHURCH,
    FunctionalRole.AUDITOR,
  )
  getPeriods(@CurrentChurch() churchId: string) {
    return this.closedPeriodRepo.find({
      where: { churchId },
      relations: ['accountSnapshots'],
      order: { year: 'DESC', month: 'DESC' },
    });
  }
}
