import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateChurchClaimDto {
  @IsUUID() churchId: string;
  @IsOptional() @IsString() @MaxLength(2000) evidence?: string;
}
