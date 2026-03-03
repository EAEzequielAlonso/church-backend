import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEnum,
} from 'class-validator';

export class RequestLoanDto {
  @IsString()
  @IsNotEmpty()
  bookId: string;

  @IsNumber()
  @IsOptional()
  durationDays?: number;
}

export class LoanActionDto {
  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  condition?: string;
}
