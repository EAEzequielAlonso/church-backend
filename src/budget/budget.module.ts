import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BudgetPeriod } from './entities/budget-period.entity';
import { BudgetAllocation } from './entities/budget-allocation.entity';
import { BudgetController } from './controllers/budget.controller';
import { CreateBudgetPeriodUseCase } from './use-cases/create-budget-period.use-case';
import { GetBudgetPeriodsUseCase } from './use-cases/get-budget-periods.use-case';
import { CreateBudgetAllocationUseCase } from './use-cases/create-budget-allocation.use-case';
import { GetBudgetAllocationsUseCase } from './use-cases/get-budget-allocations.use-case';
import { GetBudgetExecutionUseCase } from './use-cases/get-budget-execution.use-case';
import { UpdateBudgetAllocationUseCase } from './use-cases/update-budget-allocation.use-case';
import { DeleteBudgetAllocationUseCase } from './use-cases/delete-budget-allocation.use-case';
import { UpdateBudgetPeriodUseCase } from './use-cases/update-budget-period.use-case';
import { DeleteBudgetPeriodUseCase } from './use-cases/delete-budget-period.use-case';
import { ExportBudgetToPptUseCase } from './use-cases/export-budget-to-ppt.use-case';
import { TreasuryTransaction } from '../treasury/entities/treasury-transaction.entity';
import { Church } from '../churches/entities/church.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BudgetPeriod,
      BudgetAllocation,
      TreasuryTransaction, // Required for Execution aggregation
      Church,
    ]),
  ],
  controllers: [BudgetController],
  providers: [
    CreateBudgetPeriodUseCase,
    GetBudgetPeriodsUseCase,
    CreateBudgetAllocationUseCase,
    GetBudgetAllocationsUseCase,
    GetBudgetExecutionUseCase,
    UpdateBudgetAllocationUseCase,
    DeleteBudgetAllocationUseCase,
    UpdateBudgetPeriodUseCase,
    DeleteBudgetPeriodUseCase,
    ExportBudgetToPptUseCase,
  ],
  exports: [],
})
export class BudgetModule {}
