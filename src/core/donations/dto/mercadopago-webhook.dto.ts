import { IsOptional, IsString, IsObject } from 'class-validator';

export class MercadoPagoWebhookDataDto {
  @IsString()
  @IsOptional()
  id?: string;
}

export class MercadoPagoWebhookDto {
  @IsString()
  @IsOptional()
  action?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsObject()
  @IsOptional()
  data?: MercadoPagoWebhookDataDto;

  @IsString()
  @IsOptional()
  date_created?: string;

  @IsOptional()
  id?: number | string;

  @IsOptional()
  live_mode?: boolean;

  @IsString()
  @IsOptional()
  user_id?: string;
}
