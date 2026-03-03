import { IsUUID, IsNumber, Min, IsOptional, ValidateIf } from 'class-validator';

export class CreateBudgetAllocationDto {
  @IsUUID()
  budgetPeriodId: string;

  @IsUUID()
  @IsOptional()
  ministryId?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsNumber()
  @Min(0.01)
  amount: number;
}

export class UpdateBudgetAllocationDto {
  @IsNumber()
  @Min(0.01)
  amount: number;
}
