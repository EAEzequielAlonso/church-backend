
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { TransactionType } from '../enums/treasury.enums';

export class CreateCategoryDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsEnum(TransactionType)
    @IsNotEmpty()
    type: TransactionType; // INCOME or EXPENSE

    @IsOptional()
    @IsUUID()
    parentCategoryId?: string;

    @IsOptional()
    @IsString()
    color?: string;

    @IsOptional()
    @IsString()
    icon?: string;
}

export class UpdateCategoryDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsUUID()
    parentCategoryId?: string;

    @IsOptional()
    @IsString()
    color?: string;

    @IsOptional()
    @IsString()
    icon?: string;
}
