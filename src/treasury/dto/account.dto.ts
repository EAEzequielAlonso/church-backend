import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsNumber,
    Min,
    IsBoolean,
} from 'class-validator';
import { AccountType, Currency } from '../enums/treasury.enums';

export class CreateAccountDto {
    @IsNotEmpty({ message: 'El nombre de la cuenta es requerido' })
    @IsString({ message: 'El nombre debe ser una cadena de texto' })
    name: string;

    @IsEnum(AccountType, { message: 'El tipo de cuenta no es válido' })
    @IsNotEmpty({ message: 'El tipo de cuenta es requerido' })
    type: AccountType;

    @IsEnum(Currency, { message: 'La moneda no es válida' })
    @IsOptional()
    currency?: Currency; // Defaults to ARS in entity

    @IsOptional()
    @IsNumber({}, { message: 'El balance debe ser un número' })
    balance?: number;

    @IsOptional()
    @IsString({ message: 'El ID de la iglesia debe ser una cadena de texto' })
    churchId?: string;
}

export class UpdateAccountDto {
    @IsOptional()
    @IsString({ message: 'El nombre debe ser una cadena de texto' })
    name?: string;

    @IsOptional()
    @IsEnum(AccountType, { message: 'El tipo de cuenta no es válido' })
    type?: AccountType;

    @IsOptional()
    @IsEnum(Currency, { message: 'La moneda no es válida' })
    currency?: Currency;

    @IsOptional()
    @IsBoolean({ message: 'El estado de archivado debe ser un valor booleano' })
    isArchived?: boolean;
}
