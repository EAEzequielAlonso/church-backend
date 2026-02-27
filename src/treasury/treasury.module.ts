import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TreasuryController } from './treasury.controller';
import { TreasuryService } from './treasury.service';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

// Entities
import { TreasuryTransaction } from './entities/treasury-transaction.entity';
import { Account } from './entities/account.entity';
import { Budget } from './entities/budget.entity';
import { TreasuryAuditLog } from './entities/treasury-audit-log.entity';
import { Ministry } from '../ministries/entities/ministry.entity';
import { TransactionCategory } from './entities/transaction-category.entity'; // New import

// Use Cases
import { CreateTransactionUseCase } from './use-cases/create-transaction.use-case';
import { UpdateTransactionUseCase } from './use-cases/update-transaction.use-case';
import { DeleteTransactionUseCase } from './use-cases/delete-transaction.use-case';
import { GetTransactionsUseCase } from './use-cases/get-transactions.use-case';
import { GetAuditLogsUseCase } from './use-cases/get-audit-logs.use-case';
import { GetAccountBalancesUseCase } from './use-cases/get-account-balances.use-case';

// Policies
import { TreasuryPolicy } from './policies/treasury.policy';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            TreasuryTransaction,
            Account,
            Budget,
            TreasuryAuditLog,
            Ministry,
            TransactionCategory // Added TransactionCategory
        ])
    ],
    controllers: [TreasuryController, ReportsController], // Added ReportsController
    providers: [
        // Legacy Service (kept for Accounts/Budgets if not refactored yet)
        TreasuryService,
        ReportsService,

        // Domain Policy
        TreasuryPolicy,

        // Use Cases
        CreateTransactionUseCase,
        UpdateTransactionUseCase,
        DeleteTransactionUseCase,
        GetTransactionsUseCase,
        GetAuditLogsUseCase,
        GetAccountBalancesUseCase
    ],
    exports: [TreasuryService]
})
export class TreasuryModule { }
