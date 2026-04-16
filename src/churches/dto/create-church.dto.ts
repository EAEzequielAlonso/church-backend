import { IsString, IsNotEmpty, IsOptional, IsEnum, IsIn, IsUrl } from 'class-validator';
import { Currency } from '../../treasury/enums/treasury.enums';
import { ALLOWED_TIMEZONES } from '../../common/constants/timezones';

export class CreateChurchDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la iglesia es requerido' })
  name: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  accountDonation?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsNotEmpty({ message: 'El estado o provincia es requerido' })
  state: string;

  @IsString()
  @IsNotEmpty({ message: 'El país es requerido' })
  country: string;

  @IsString()
  @IsNotEmpty({ message: 'La zona horaria es requerida' })
  @IsIn(ALLOWED_TIMEZONES, { message: 'La zona horaria no es válida' })
  timezone: string;

  @IsEnum(Currency, { message: 'La moneda no es válida' })
  @IsOptional()
  baseCurrency?: Currency;

  @IsUrl({}, { message: 'La URL del logo no es válida' })
  @IsOptional()
  logoUrl?: string;

  @IsUrl({}, { message: 'La URL de la portada no es válida' })
  @IsOptional()
  coverUrl?: string;
}
