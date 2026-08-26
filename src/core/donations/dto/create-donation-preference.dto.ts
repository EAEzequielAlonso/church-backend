import { IsNumber, IsPositive, Min } from 'class-validator';

export class CreateDonationPreferenceDto {
  @IsNumber()
  @IsPositive()
  @Min(100) // Monto mínimo razonable (ej. 100 ARS), evitable si es necesario según reglas de negocio
  amount: number;
}
