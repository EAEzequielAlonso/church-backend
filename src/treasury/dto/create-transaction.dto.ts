import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Currency, TransactionType } from '../enums/treasury.enums';

export class CreateTransactionDto {
    @IsEnum(TransactionType)
    @IsNotEmpty()
    type: TransactionType;

    @IsNumber()
    @Min(0.01)
    @IsNotEmpty()
    amount: number;

    @IsEnum(Currency)
    @IsNotEmpty()
    currency: Currency;

    @IsNumber()
    @Min(0.00000001)
    @IsOptional()
    exchangeRate?: number; // Defaults to 1 if not provided

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsOptional()
    @IsString()
    reference?: string;

    @IsOptional()
    @IsString()
    date?: string; // ISO Date string

    // --- Relationships ---

    @IsOptional()
    @IsUUID()
    sourceAccountId?: string; // Required for EXPENSE, TRANSFER

    @IsOptional()
    @IsUUID()
    destinationAccountId?: string; // Required for INCOME, TRANSFER

    @IsOptional()
    @IsUUID()
    categoryId?: string; // Required for INCOME, EXPENSE. Null for TRANSFER.

    @IsOptional()
    @IsUUID()
    ministryId?: string;
}
