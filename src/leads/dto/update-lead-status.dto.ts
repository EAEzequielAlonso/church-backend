import { IsEnum, IsNotEmpty } from 'class-validator';
import { LeadStatus } from '../entities/lead.entity';

export class UpdateLeadStatusDto {
  @IsEnum(LeadStatus)
  @IsNotEmpty()
  status: LeadStatus;
}
