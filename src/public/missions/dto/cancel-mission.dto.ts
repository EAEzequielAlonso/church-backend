import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CancelMissionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;
}