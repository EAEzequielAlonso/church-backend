import {
    IsNotEmpty,
    IsOptional,
    IsNumber,
    IsUUID,
    IsInt,
    IsString,
    IsArray,
    ValidateNested,
    IsEnum,
    Min,
    Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BudgetLineType } from '../enums/treasury.enums';

export class BudgetLineDto {
    @IsEnum(BudgetLineType)
    type: BudgetLineType;

    @IsOptional()
    @IsUUID()
    ministryId?: string;

    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @IsNumber()
    @Min(0.01)
    budgetedAmount: number;
}

export class CreateBudgetDto {
    @IsInt()
    @Min(2000)
    @Max(2100)
    year: number;

    @IsInt()
    @Min(1)
    @Max(12)
    month: number;

    @IsNumber()
    @Min(0)
    projectedIncomeTotal: number;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BudgetLineDto)
    lines: BudgetLineDto[];

    @IsOptional()
    @IsString()
    reason?: string;
}
