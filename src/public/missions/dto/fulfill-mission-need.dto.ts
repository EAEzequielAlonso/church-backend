import { IsOptional, IsUUID } from 'class-validator';

export class FulfillMissionNeedDto {
  @IsUUID()
  @IsOptional()
  churchId?: string;

  @IsUUID()
  @IsOptional()
  personId?: string;
}
