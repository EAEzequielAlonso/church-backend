import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class ClaimProfileDto {
  @IsUUID()
  @IsOptional()
  personId?: string;

  @IsBoolean()
  createNew: boolean;
}
