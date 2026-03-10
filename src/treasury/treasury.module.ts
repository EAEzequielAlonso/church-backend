import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TreasuryController } from './treasury.controller';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

// Entities
import { TreasuryTransaction } from './entities/treasury-transaction.entity';
import { Account } from './entities/account.entity';
import { Budget } from './entities/budget.entity';
import { BudgetLine } from './entities/budget-line.entity';
import { TreasuryAuditLog } from './entities/treasury-audit-log.entity';
import { Ministry } from '../ministries/entities/ministry.entity';
import { TransactionCategory } from './entities/transaction-category.entity';
import { ClosedPeriod } from './entities/closed-period.entity';
import { PeriodAccountSnapshot } from './entities/period-account-snapshot.entity';

// Policies
import { TreasuryPolicy } from './policies/treasury.policy';

// Use Cases — Transactions
import { CreateTransactionUseCase } from './use-cases/create-transaction.use-case';
import { UpdateTransactionUseCase } from './use-cases/update-transaction.use-case';
import { DeleteTransactionUseCase } from './use-cases/delete-transaction.use-case';
import { CorrectTransactionUseCase } from './use-cases/correct-transaction.use-case';
import { GetTransactionsUseCase } from './use-cases/get-transactions.use-case';
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

// Use Cases — Budgets
import { CreateBudgetUseCase } from './use-cases/create-budget.use-case';
import { GetBudgetsUseCase } from './use-cases/get-budgets.use-case';
import { DeleteBudgetUseCase } from './use-cases/delete-budget.use-case';
import { GetBudgetExecutionUseCase } from './use-cases/get-budget-execution.use-case';

// Use Cases — Periods
import { ClosePeriodUseCase } from './use-cases/close-period.use-case';
import { ReopenPeriodUseCase } from './use-cases/reopen-period.use-case';

// Use Cases — Reports
import { GetSummaryUseCase } from './use-cases/get-summary.use-case';
import { GetCashflowUseCase } from './use-cases/get-cashflow.use-case';
import { GetCategoryBreakdownUseCase } from './use-cases/get-category-breakdown.use-case';
import { GetMinistryBreakdownUseCase } from './use-cases/get-ministry-breakdown.use-case';
import { GetAccountBalancesUseCase } from './use-cases/get-account-balances.use-case';
import { GetTrendAnalysisUseCase } from './use-cases/get-trend-analysis.use-case';

const USE_CASES = [
  // Transactions
  CreateTransactionUseCase,
  UpdateTransactionUseCase,
  DeleteTransactionUseCase,
  CorrectTransactionUseCase,
  GetTransactionsUseCase,
  GetAuditLogsUseCase,

  // Accounts
  CreateAccountUseCase,
  GetAccountsUseCase,
  UpdateAccountUseCase,
  DeleteAccountUseCase,

  // Categories
  CreateCategoryUseCase,
  GetCategoriesUseCase,
  UpdateCategoryUseCase,
  DeleteCategoryUseCase,

  // Budgets
  CreateBudgetUseCase,
  GetBudgetsUseCase,
  DeleteBudgetUseCase,
  GetBudgetExecutionUseCase,

  // Periods
  ClosePeriodUseCase,
  ReopenPeriodUseCase,

  // Reports
  GetSummaryUseCase,
  GetCashflowUseCase,
  GetCategoryBreakdownUseCase,
  GetMinistryBreakdownUseCase,
  GetAccountBalancesUseCase,
  GetTrendAnalysisUseCase,
];

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TreasuryTransaction,
      Account,
      Budget,
      BudgetLine,
      TreasuryAuditLog,
      Ministry,
      TransactionCategory,
      ClosedPeriod,
      PeriodAccountSnapshot,
    ]),
  ],
  controllers: [TreasuryController, ReportsController],
  providers: [
    ReportsService,
    TreasuryPolicy,
    ...USE_CASES,
  ],
})
export class TreasuryModule { }
