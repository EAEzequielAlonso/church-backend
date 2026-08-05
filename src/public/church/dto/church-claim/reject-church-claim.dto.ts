import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class RejectChurchClaimDto {
  @ApiProperty({ description: 'Motivo del rechazo' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  notes: string;
}
