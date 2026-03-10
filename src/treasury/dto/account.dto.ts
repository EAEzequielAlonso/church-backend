import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsNumber,
    Min,
} from 'class-validator';
import { AccountType, Currency } from '../enums/treasury.enums';

export class CreateAccountDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsEnum(AccountType)
    @IsNotEmpty()
    type: AccountType;

    @IsEnum(Currency)
    @IsOptional()
    currency?: Currency; // Defaults to ARS in entity
}

export class UpdateAccountDto {
    @IsOptional()
    @IsString()
    name?: string;
}
